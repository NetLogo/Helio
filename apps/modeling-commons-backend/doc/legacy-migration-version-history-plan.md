# Legacy Migration: Version History (revert + compare)

Migrates two endpoints from the legacy `HistoryController` (`modelingcommons/app/controllers/history_controller.rb`) into the Fastify+TypeScript backend:

- **Revert** — `revert_model` legacy action. Creates a new `ModelVersion` whose contents are copied from an older version.
- **Compare** — `compare_versions` legacy action. Returns a unified text diff between two `ModelVersion` rows of the same model.

Treated as greenfield — no preservation of legacy URL shapes, payloads, or flash-message redirect flow. The plan slots both features into the existing `src/modules/model-version/` module following the DDD skeleton in `apps/modeling-commons-backend/CLAUDE.md`.

## Scope of changes

- **No schema migration.** Both endpoints operate over existing `ModelVersion` rows. `modelId, versionNumber, title, description, infoTab, netlogoFileKey, netlogoVersion, previewImage, createdAt, finalizedAt` are all already present in `prisma/schema.prisma`. No new tables, columns, indexes, or constraints.
- New write path uses an explicit `patches/` directory inside `model-version/` (CQRS-style — see CLAUDE.md "patches/" entry). This is the first patch in the module; introducing the directory is intentional.
- New read path uses the existing `queries/` directory.
- One new domain utility for `.nlogox` section extraction.

## Decisions (already locked)

- **Revert builds a new finalized version.** `versionNumber = latest + 1`. Copies `netlogoFileKey`, `infoTab`, `netlogoVersion`, `previewImage` from the source. Sets `title` to the source's `title`, `description` defaults to `"Reverted to v{n}"` (overridable via request body), `finalizedAt = now`.
- **S3 blob is shared, not duplicated.** The new row points at the source's `netlogoFileKey`. Safe because finalized versions are immutable (no overwrite, no delete-on-rewrite). Saves storage; one S3 object can be referenced by N versions.
- **Compare is server-rendered unified diff.** Output is plain text per section. Frontend renders, does not parse.
- **Only `.nlogox` (XML) is supported.** The legacy `@#$#@#$#@` section-separated format is not migrated. No legacy models exist in Helio yet.
- **Permissions:** revert needs `resolveModel('write')`, compare needs `resolveModel('read')`.
- **Events:** revert emits `model_version.reverted`. Compare emits nothing (pure read).

## New / modified files

```
src/modules/model-version/
  domain/
    model-version.errors.ts                          (modified)
    nlogox-sections.ts                               (new)
    nlogox-sections.spec.ts                          (new)
    model-version.domain.ts                          (modified — add createReverted factory)
  database/
    model-version.repository.ts                      (unchanged — existing methods cover all needs)
    model-version.repository.port.ts                 (unchanged)
  dtos/
    revert-version.request.dto.ts                    (new)
    revert-version.response.dto.ts                   (new)
    compare-versions.response.dto.ts                 (new)
  patches/
    revert-version.patch.ts                          (new)
    revert-version.patch.spec.ts                     (new)
  queries/
    compare-versions.query.ts                        (new)
    compare-versions.query.spec.ts                   (new)
  model-version.route.ts                             (modified — two new route registrations)
  model-version.schemas.ts                           (modified — new param/querystring schemas)
  index.ts                                           (modified — DI registrations)

tests/integration/
  model-version-history.test.ts                      (new — e2e for both endpoints)
```

## Dependencies

Verified against `apps/modeling-commons-backend/package.json` at the time of writing.

- `diff` — **not currently a dep.** Add `diff` to `dependencies` and `@types/diff` to `devDependencies`. Used: `diff.createPatch(filename, oldStr, newStr, oldHeader?, newHeader?)` → unified-format string.
- `fast-xml-parser` — **not currently a dep.** Add `fast-xml-parser` to `dependencies`. Used to parse `.nlogox` XML. Note: `dom-parser` is in devDependencies but is geared toward HTML and is not appropriate for our use. Do not reuse it.

Both packages are small, zero-runtime-deps, MIT licensed.

## Domain helper: `nlogox-sections.ts`

```ts
// src/modules/model-version/domain/nlogox-sections.ts
import { XMLParser } from 'fast-xml-parser';

export type NlogoxSections = {
  info: string;
  code: string;
  interface: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  preserveOrder: false,
  trimValues: false,
});

export function extractSections(xmlString: string): NlogoxSections {
  // Defensive: malformed XML or missing sections return empty strings,
  // never throw. Compare endpoint should never 500 on a bad upload.
  let parsed: unknown;
  try {
    parsed = parser.parse(xmlString);
  } catch {
    return { info: '', code: '', interface: '' };
  }

  const model = (parsed as { model?: Record<string, unknown> })?.model ?? {};

  const info = typeof model.info === 'string' ? model.info : '';
  const code = typeof model.code === 'string' ? model.code : '';

  // `widgets` is an object subtree in .nlogox. Serialize it deterministically
  // so a diff over the interface block makes sense.
  const widgets = (model as { widgets?: unknown }).widgets;
  const iface = widgets === undefined ? '' : stableStringify(widgets);

  return { info, code, interface: iface };
}

function stableStringify(value: unknown): string {
  // Sorted-key JSON so diffs are stable across parser versions.
  return JSON.stringify(value, Object.keys(value as object).sort(), 2);
}
```

`fast-xml-parser` docs: <https://github.com/NaturalIntelligence/fast-xml-parser>. Key behaviors we rely on: text-only children collapse to strings; nested elements become nested objects.

## Domain factory: `createReverted`

Added to `model-version.domain.ts` alongside the existing `createVersion`.

```ts
createReverted(props: {
  modelId: string;
  sourceVersion: ModelVersionEntity;
  newVersionNumber: number;
  description?: string;
}): ModelVersionEntity {
  const now = new Date();
  return {
    modelId: props.modelId,
    versionNumber: props.newVersionNumber,
    title: props.sourceVersion.title,
    description: props.description ?? `Reverted to v${props.sourceVersion.versionNumber}`,
    previewImage: props.sourceVersion.previewImage,
    netlogoFileKey: props.sourceVersion.netlogoFileKey, // S3 key reused, blob NOT copied
    netlogoVersion: props.sourceVersion.netlogoVersion,
    infoTab: props.sourceVersion.infoTab,
    createdAt: now,
    finalizedAt: now, // revert produces a finalized (immutable) version immediately
  };
},
```

## Domain errors (new in `model-version.errors.ts`)

```ts
export class CannotRevertToCurrentError extends ConflictException {
  constructor(modelId: string, versionNumber: number) {
    super(
      `Version ${versionNumber} of model ${modelId} is already the current version; nothing to revert.`,
    );
  }
}

export class CannotRevertToDraftError extends ConflictException {
  constructor(modelId: string, versionNumber: number) {
    super(
      `Version ${versionNumber} of model ${modelId} is a draft and cannot be used as a revert source.`,
    );
  }
}

export class CompareSameVersionError extends ConflictException {
  constructor(versionNumber: number) {
    super(`Cannot compare version ${versionNumber} with itself.`);
  }
}
```

## Patch handler: `revert-version.patch.ts`

```ts
// src/modules/model-version/patches/revert-version.patch.ts
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';
import {
  CannotRevertToCurrentError,
  CannotRevertToDraftError,
} from '#src/modules/model-version/domain/model-version.errors.ts';

export default function makeRevertVersionPatch({
  transactionManager,
  modelVersionRepository,
  modelVersionDomain,
  modelRepository,
  eventRepository,
}: Dependencies) {
  return {
    async execute(
      modelId: string,
      sourceVersionNumber: number,
      actorId: string,
      input: { description?: string },
    ): Promise<number> {
      const source = await modelVersionRepository.findByModelAndVersion(
        modelId,
        sourceVersionNumber,
      );
      if (!source) throw new VersionNotFoundError(modelId, sourceVersionNumber);
      if (!source.finalizedAt) {
        throw new CannotRevertToDraftError(modelId, sourceVersionNumber);
      }

      const latest = await modelVersionRepository.findLatestByModel(modelId);
      if (latest && latest.versionNumber === sourceVersionNumber) {
        throw new CannotRevertToCurrentError(modelId, sourceVersionNumber);
      }

      return transactionManager.run(async (ctx) => {
        // Finalize whatever is currently the latest (mirrors the create() flow).
        if (latest && !latest.finalizedAt) {
          await modelVersionRepository.finalize(ctx, latest.modelId, latest.versionNumber);
        }

        const newVersionNumber = await modelVersionRepository.getNextVersionNumber(ctx, modelId);
        const entity = modelVersionDomain.createReverted({
          modelId,
          sourceVersion: source,
          newVersionNumber,
          description: input.description,
        });

        await modelVersionRepository.insertTx(ctx, entity);
        await modelRepository.setLatestVersion(ctx, modelId, newVersionNumber);

        await eventRepository.insert(ctx, {
          type: 'model_version.reverted',
          actorId,
          resourceType: 'model_version',
          resourceId: `${modelId}:${newVersionNumber}`,
          payload: {
            modelId,
            sourceVersionNumber,
            newVersionNumber,
          },
        });

        return newVersionNumber;
      });
    },
  };
}
```

Notes:

- Reuses existing repository methods (`findByModelAndVersion`, `findLatestByModel`, `getNextVersionNumber`, `insertTx`, `finalize`). No new repo methods needed.
- Reuses existing `modelRepository.setLatestVersion` (already called by the create flow).
- Single `transactionManager.run` covers insert + latest-version update + event emission — all-or-nothing.

## Query handler: `compare-versions.query.ts`

```ts
// src/modules/model-version/queries/compare-versions.query.ts
import { createPatch } from 'diff';
import { extractSections } from '#src/modules/model-version/domain/nlogox-sections.ts';
import {
  VersionNotFoundError,
  CompareSameVersionError,
} from '#src/modules/model-version/domain/model-version.errors.ts';
import type { CompareVersionsResponseDto } from '#src/modules/model-version/dtos/compare-versions.response.dto.ts';

export default function makeCompareVersionsQuery({
  modelVersionRepository,
  fileService,
}: Dependencies) {
  return {
    async execute(
      modelId: string,
      fromVersionNumber: number,
      toVersionNumber: number,
    ): Promise<CompareVersionsResponseDto> {
      if (fromVersionNumber === toVersionNumber) {
        throw new CompareSameVersionError(fromVersionNumber);
      }

      const [from, to] = await Promise.all([
        modelVersionRepository.findByModelAndVersion(modelId, fromVersionNumber),
        modelVersionRepository.findByModelAndVersion(modelId, toVersionNumber),
      ]);
      if (!from) throw new VersionNotFoundError(modelId, fromVersionNumber);
      if (!to) throw new VersionNotFoundError(modelId, toVersionNumber);

      const [fromBlob, toBlob] = await Promise.all([
        fileService.download(from.netlogoFileKey),
        fileService.download(to.netlogoFileKey),
      ]);

      const fromXml = fromBlob.blob.toString('utf8');
      const toXml = toBlob.blob.toString('utf8');
      const fromSections = extractSections(fromXml);
      const toSections = extractSections(toXml);

      const headerFrom = `v${fromVersionNumber}`;
      const headerTo = `v${toVersionNumber}`;

      return {
        from: { versionNumber: from.versionNumber, createdAt: from.createdAt.toISOString() },
        to: { versionNumber: to.versionNumber, createdAt: to.createdAt.toISOString() },
        sections: {
          info: createPatch('info', fromSections.info, toSections.info, headerFrom, headerTo),
          code: createPatch('code', fromSections.code, toSections.code, headerFrom, headerTo),
          interface: createPatch(
            'interface',
            fromSections.interface,
            toSections.interface,
            headerFrom,
            headerTo,
          ),
        },
      };
    },
  };
}
```

Performance notes:

- Two S3 GETs in parallel. `.nlogox` files are typically under 1MB; no caching needed for v1.
- If profiling shows hot paths, an LRU cache keyed on `netlogoFileKey` (immutable S3 key) is trivial to add later.

## DTOs

```ts
// dtos/revert-version.request.dto.ts
export const revertVersionRequestDtoSchema = Type.Object({
  description: Type.Optional(Type.String({ maxLength: 10000 })),
});
export type RevertVersionRequestDto = Static<typeof revertVersionRequestDtoSchema>;

// dtos/revert-version.response.dto.ts
export const revertVersionResponseDtoSchema = Type.Object({
  modelId: Type.String({ format: 'uuid' }),
  versionNumber: Type.Integer({ minimum: 1 }),
});
export type RevertVersionResponseDto = Static<typeof revertVersionResponseDtoSchema>;

// dtos/compare-versions.response.dto.ts
export const compareVersionsResponseDtoSchema = Type.Object({
  from: Type.Object({
    versionNumber: Type.Integer({ minimum: 1 }),
    createdAt: Type.String({ format: 'date-time' }),
  }),
  to: Type.Object({
    versionNumber: Type.Integer({ minimum: 1 }),
    createdAt: Type.String({ format: 'date-time' }),
  }),
  sections: Type.Object({
    info: Type.String(),
    code: Type.String(),
    interface: Type.String(),
  }),
});
export type CompareVersionsResponseDto = Static<typeof compareVersionsResponseDtoSchema>;
```

Also add a querystring schema for compare in `model-version.schemas.ts`:

```ts
export const compareVersionsQuerySchema = Type.Object({
  from: Type.Integer({ minimum: 1 }),
  to: Type.Integer({ minimum: 1 }),
});
export type CompareVersionsQuery = Static<typeof compareVersionsQuerySchema>;
```

## Routes (`model-version.route.ts`)

Append the following inside `modelVersionRoutes`. Note that the compare route must be registered **before** the `:version` path so Fastify does not interpret `compare` as a version number — or use a non-overlapping path (preferred: `/versions/compare`).

```ts
fastify.post<{ Params: VersionParams; Body: RevertVersionRequestDto }>(
  '/v1/models/:id/versions/:version/revert',
  {
    schema: {
      params: versionParamsSchema,
      body: revertVersionRequestDtoSchema,
      response: { 201: revertVersionResponseDtoSchema },
      tags: ['Model'],
      description:
        'Create a new finalized version whose contents are copied from an older version. The new version becomes the current version.',
    },
    preHandler: [requireAuth, resolveModel('write')],
  },
  async (request, reply) => {
    const newVersionNumber = await revertVersionPatch.execute(
      request.params.id,
      request.params.version,
      request.user!.id,
      request.body,
    );
    return reply.code(201).send({ modelId: request.params.id, versionNumber: newVersionNumber });
  },
);

fastify.get<{ Params: ModelIdParams; Querystring: CompareVersionsQuery }>(
  '/v1/models/:id/versions/compare',
  {
    schema: {
      params: modelIdParamsSchema,
      querystring: compareVersionsQuerySchema,
      response: { 200: compareVersionsResponseDtoSchema },
      tags: ['Model'],
      description:
        'Compare two versions of a model. Returns unified-format text diffs for the info, code, and interface sections.',
    },
    preHandler: [resolveModel('read')],
  },
  async (request) => {
    return compareVersionsQuery.execute(
      request.params.id,
      request.query.from,
      request.query.to,
    );
  },
);
```

Status codes:

- Revert success → `201 { modelId, versionNumber }`.
- Compare success → `200 CompareVersionsResponseDto`.
- `VersionNotFoundError` → `404`.
- `CannotRevertToCurrentError`, `CannotRevertToDraftError`, `CompareSameVersionError` → `409` (they extend `ConflictException`).
- Missing auth → `401`. Missing model perms → `403` (handled by `resolveModel`).

## Validation

- Revert request body: optional `description` ≤ 10000 chars. Empty/whitespace-only description is rejected at the schema layer if we tighten with `minLength: 1` — see Open Questions below.
- Compare querystring: `from` and `to` are both required positive integers. Equality is a domain-level rejection (`CompareSameVersionError`), not a Typebox constraint, so the error message is clear.
- Both versions must belong to the same `modelId` (enforced by the lookup — `findByModelAndVersion(modelId, n)` will return `undefined` if `n` exists only on a different model).
- Source version must be finalized to revert from. Drafts produce a `409`.

## DI registrations (`model-version/index.ts`)

Augment the `Dependencies` interface. Awilix auto-loads file-name based, so the new files register themselves; the type declarations just need to reflect them.

```ts
revertVersionPatch: ReturnType<
  typeof import('#src/modules/model-version/patches/revert-version.patch.ts').default
>;
compareVersionsQuery: ReturnType<
  typeof import('#src/modules/model-version/queries/compare-versions.query.ts').default
>;
```

`fileService` is already in the cradle (used by `model-version.service.ts`) so the compare query gets S3 downloads for free.

## Tests

### Unit

- **`nlogox-sections.spec.ts`**
  - happy path: real `.nlogox` fixture returns non-empty `info`, `code`, `interface`.
  - missing `<info>` → `info: ''`.
  - missing `<widgets>` → `interface: ''`.
  - malformed XML → returns `{ info: '', code: '', interface: '' }`, does not throw.
  - widget order changes shouldn't churn diffs (verifies the sorted-key `stableStringify`).

- **`revert-version.patch.spec.ts`** (uses `model-version.repository.mock.ts`)
  - happy path: reverts v1 → creates v3 (when latest is v2), event emitted with correct payload.
  - source missing → `VersionNotFoundError`.
  - source is the current/latest version → `CannotRevertToCurrentError`.
  - source is a draft (`finalizedAt: null`) → `CannotRevertToDraftError`.
  - new version reuses source's `netlogoFileKey` (assert by identity).
  - default description is `"Reverted to v{n}"`; override is honored.
  - `finalizedAt` is set on the new version.

- **`compare-versions.query.spec.ts`** (mocks `modelVersionRepository` and `fileService`)
  - happy path: returns valid unified-diff strings for all three sections.
  - identical versions (same content) → diffs are empty strings (the `diff` library returns an empty patch header only; assert reasonable structure).
  - from == to → `CompareSameVersionError`.
  - either version missing → `VersionNotFoundError`.
  - asserts both S3 fetches run in parallel (assert call order is non-blocking — optional).

### Integration

- **`tests/integration/model-version-history.test.ts`**
  - Seed: one user, one model, three finalized versions with distinct `.nlogox` fixtures (different info/code/widgets).
  - `POST /v1/models/:id/versions/:version/revert` with `version=1` → 201, response includes `versionNumber: 4`, subsequent `GET /v1/models/:id/versions/4` shows expected fields.
  - Revert to current → 409.
  - Revert without auth → 401.
  - Revert without write perm → 403.
  - `GET /v1/models/:id/versions/compare?from=1&to=2` → 200, response shape matches DTO, info section diff contains expected line markers.
  - `compare?from=1&to=1` → 409.
  - `compare?from=1&to=99` → 404.
  - Cross-model: `compare` with a version number that exists only on a different model → 404.
  - Event check: a `model_version.reverted` row exists in `Event` after revert.

## Open questions (deferred)

- Should `description` on revert be required and non-empty? Currently optional with auto-generated default. Defer.
- Should compare allow cross-fork comparison (`compare?fromModelId=A&toModelId=B`)? Adds a permission-resolution wrinkle (need read on both models). Defer; not a legacy capability.
- Should there be a convenience `GET /v1/models/:id/versions/:n/preview-diff` that always compares against the previous version? Nice frontend affordance. Defer.
- Should the unified-diff context size (default 4 lines from `diff.createPatch`) be tunable via querystring? Defer.

## Out of scope

- Frontend diff renderer (side-by-side, syntax highlighting, expandable hunks). The backend returns plain unified-diff text and the frontend owns presentation.
- Structured-JSON diff output (e.g. per-hunk objects). The `diff` package offers `structuredPatch` — easy to swap later if a richer format is needed.
- Diffing the binary `previewImage`. Not migrated from legacy.
- Reverting across models (i.e. pulling a version from a forked model back into the original). Out of legacy scope and security model.
- Migrating any legacy `Version` rows. Pre-beta; no data to carry over.
