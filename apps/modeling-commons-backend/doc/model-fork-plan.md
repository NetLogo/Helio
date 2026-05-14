# Model Fork

Light up the lineage columns that have been sitting unused on `Model` (`parentModelId`, `parentVersionNumber`). The schema has had room for forks since the original DDD reshuffle; the frontend fork-graph viewer already reads them. What is missing is the write side — an endpoint that takes a finalized version of an existing model and produces a brand-new model whose `parentModelId` / `parentVersionNumber` point back at that snapshot. This plan introduces that endpoint and, in doing so, establishes the canonical shape of a `patch` handler (the write-side CQRS unit that `CLAUDE.md` reserves for complex mutations). Fork is the first such handler; future patches (`publish-*`, etc.) should mirror it.

Cross-link: [[legacy-migration-fork-graph-plan]] is the read side that consumes the columns this endpoint writes.

## No schema changes

`Model.parentModelId` (`String?`) and `Model.parentVersionNumber` (`Int?`) already exist, indexed individually and as a composite (`@@index([parentModelId, parentVersionNumber])`). The relations `parentModel`, `parentVersion`, and the reverse `childModels` are wired. The fork-graph query (`getModelChildrenQuery`) is already in production reading them. No migration is needed.

## Endpoint

```
POST /v1/models/:id/versions/:version/fork
```

The URL is explicit about *which* version is being forked. No implicit-latest convenience endpoint — we considered `POST /v1/models/:id/fork` and dropped it; if UX asks, revisit. The `:version` segment is coerced by Typebox `Type.Integer({ minimum: 1 })`.

`preHandler: [requireAuth, resolveModel('read')]`. Anyone who can see the source can fork it; `resolveModel('read')` already attaches the source `model` to `request.model` and rejects soft-deleted / inaccessible models with the usual 403/404. The `:id` parameter naming matches the existing pattern in `model-version.route.ts` (`ModelIdParams.id` + `VersionParams.version`).

Response status: `201`. Body: `{ id }` (the new model id).

## Service vs patch boundary

`model.service.ts` today is small and shaped around single-aggregate CRUD: `update`, `softDelete`, `findById`, `findRandomPublic`, `resolveLegacyId`. Fork does not fit that mold. It:

- spans three aggregates inside a single transaction (`Model` + `ModelVersion` + `ModelAuthor`)
- performs an out-of-band S3 `CopyObject` *before* the transaction
- has branching default logic for the request body (title fallback, description fallback, visibility default)
- emits a domain event on the *new* model

That is a complex, multi-aggregate write — exactly what `patches/` is for. `model.service.ts` stays focused on per-aggregate CRUD; the patch composes domain factories and repositories directly. Future complex mutations (publish, transfer-with-history, etc.) follow the same split.

## New files

- `src/modules/model/patches/fork-model.patch.ts` — the patch handler (new directory; this is the first patch).
- `src/modules/model/patches/fork-model.patch.spec.ts` — unit tests.
- `src/modules/model/dtos/fork-model.request.dto.ts` — Typebox request schema + inferred type.
- `src/modules/model/dtos/fork-model.response.dto.ts` — Typebox response (just re-exports `idDtoSchema`; kept for symmetry / future change).
- Route registration appended to `src/modules/model-version/model-version.route.ts`. The URL nests under `/versions/:version/fork`, so it sits naturally with the other version routes; the *handler* is the `model` module's `forkModelPatch`, pulled from `fastify.diContainer.cradle`. Both modules are awilix-registered so the cross-module wiring is fine.
- New error classes in `src/modules/model/domain/model.errors.ts`: `CannotForkDeletedModelError`, `CannotForkDraftVersionError`. `VersionNotFoundError` from `model-version/domain/model-version.errors.ts` is reused.
- New domain factory `createForkedModel` added to `src/modules/model/domain/model.domain.ts`.
- New service method `fileService.copy(srcKey)` added to `src/modules/file/file.service.ts` (see below).
- DI registration in `src/modules/model/index.ts` (extend the `Dependencies` block with `forkModelPatch`).
- Integration test `tests/integration/model-fork.test.ts`.

## Patch handler shape — the pattern

This is the template for every future patch. Single factory, explicit deps, single exported async method, no class state, transaction confined to one `transactionManager.run`. The patch composes domain factories + repositories — it does *not* delegate into other services (services are the wrong granularity for a multi-aggregate write).

```ts
// src/modules/model/patches/fork-model.patch.ts
import type {
  ForkModelRequestDto,
} from '#src/modules/model/dtos/fork-model.request.dto.ts';

export type ForkModelInput = {
  sourceModelId: string;
  sourceVersionNumber: number;
  callerId: string;
  body: ForkModelRequestDto;
};

export type ForkModelResult = { id: string };

export default function makeForkModelPatch({
  transactionManager,
  modelDomain,
  modelRepository,
  modelVersionDomain,
  modelVersionRepository,
  modelAuthorDomain,
  modelAuthorRepository,
  fileService,
  eventRepository,
  logger,
}: Dependencies) {
  return async function forkModel(input: ForkModelInput): Promise<ForkModelResult> {
    // ... algorithm below
  };
}
```

DI registration in `src/modules/model/index.ts`:

```ts
forkModelPatch: ReturnType<
  typeof import('#src/modules/model/patches/fork-model.patch.ts').default
>;
```

Register in awilix the same way `modelService` is registered (factory function, transient or scoped per existing convention — match whatever `modelService` uses).

## DTOs

```ts
// fork-model.request.dto.ts
export const forkModelRequestDtoSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  description: Type.Optional(Type.String({ minLength: 0, maxLength: 2000 })),
  visibility: Type.Optional(visibilitySchema),
});
export type ForkModelRequestDto = Static<typeof forkModelRequestDtoSchema>;
```

```ts
// fork-model.response.dto.ts
export const forkModelResponseDtoSchema = idDtoSchema;
export type ForkModelResponseDto = Static<typeof forkModelResponseDtoSchema>;
```

All three body fields are optional. Defaults are filled in by the patch (see Algorithm step 5).

## Route

Appended to `model-version.route.ts`:

```ts
fastify.post<{ Params: VersionParams; Body: ForkModelRequestDto }>(
  '/v1/models/:id/versions/:version/fork',
  {
    schema: {
      params: versionParamsSchema,
      body: forkModelRequestDtoSchema,
      response: { 201: forkModelResponseDtoSchema },
      tags: ['Model'],
    },
    preHandler: [requireAuth, resolveModel('read')],
  },
  async (request, reply) => {
    const { id, version } = request.params;
    const result = await forkModelPatch({
      sourceModelId: id,
      sourceVersionNumber: version,
      callerId: request.user!.id,
      body: request.body,
    });
    return reply.code(201).send(result);
  },
);
```

Pull `forkModelPatch` from `fastify.diContainer.cradle` at the top of the route file alongside the other deps.

## Algorithm

```
forkModel({ sourceModelId, sourceVersionNumber, callerId, body }):
  1. Load source model via modelRepository.findOneById(sourceModelId).
     If missing -> ModelNotFoundError (defense-in-depth; resolveModel already
     guarantees it exists, but the patch shouldn't trust the route).
     modelDomain.assertNotDeleted(source)
       -> on failure throw CannotForkDeletedModelError (subclass of ConflictException)

  2. Load source version via modelVersionRepository.findByModelAndVersion(
       sourceModelId, sourceVersionNumber
     ).
     If missing -> VersionNotFoundError(sourceModelId, sourceVersionNumber)
     If source.finalizedAt is null -> CannotForkDraftVersionError

  3. Generate newModelId = randomUUID()
     Generate newFileKey via the same util used by ModelVersionService.create
     (today that's fileService.upload which delegates to createStorageKey under
     `uploads/models/${newModelId}/versions`). For the copy path we want a key
     under that prefix without uploading bytes — call fileService.copy(srcKey,
     { pathPrefix: `uploads/models/${newModelId}/versions`, filename:
     source.netlogoFileKey.split('/').pop() }) which generates the destination
     key internally via createStorageKey and performs an S3 CopyObject.

  4. S3 copy — OUTSIDE the transaction.
     const { key: newFileKey } = await fileService.copy(source.netlogoFileKey, {
       pathPrefix: `uploads/models/${newModelId}/versions`,
       filename: <derived from source key>,
     })
     If S3 fails: the error bubbles. No DB row was written. Safe.

  5. Build entities via domain factories:

     const newModel = modelDomain.createForkedModel({
       id: newModelId,
       parentModelId: sourceModelId,
       parentVersionNumber: sourceVersionNumber,
       visibility: body.visibility ?? 'private',
     })

     const newVersion = modelVersionDomain.createVersion({
       modelId: newModelId,
       versionNumber: 1,
       title: body.title ?? `${source.title} (fork)`,
       description: body.description ?? source.description ?? undefined,
       previewImage: source.previewImage ?? undefined,
       netlogoFileKey: newFileKey,
     })
     // Note: createVersion currently sets netlogoVersion and infoTab to null.
     // The forked version should carry them over. Either extend createVersion
     // to accept them, or set them post-construction. Plan choice: extend
     // createVersion to accept optional `netlogoVersion` and `infoTab` so the
     // domain factory remains the single point of construction. Existing
     // callers default both to null and are unaffected.

     const newAuthor = modelAuthorDomain.createAuthor(newModelId, callerId, 'owner')

  6. transactionManager.run(async (ctx) => {
       await modelRepository.insertTx(ctx, newModel)
       await modelVersionRepository.insertTx(ctx, newVersion)
       await modelRepository.setLatestVersion(ctx, newModelId, 1)
       await modelAuthorRepository.insertTx(ctx, newAuthor)
       await eventRepository.insert(ctx, {
         type: 'model.forked',
         actorId: callerId,
         resourceType: 'model',
         resourceId: newModelId,
         payload: { sourceModelId, sourceVersionNumber },
       })
     })

  7. return { id: newModelId }
```

Notes on the event: `resourceType: 'model'`, `resourceId: newModelId` — the event is emitted *on the new model*, not on the source. The forker is the actor. Payload carries the lineage so listeners (notifications, analytics) can resolve back to the source without a join.

Notes on `setLatestVersion`: the forked model has exactly one version (number 1), and it is finalized? No — the new version starts as a draft (`finalizedAt = null`), matching the behavior of `ModelVersionService.create` for fresh models. The forker can then iterate on the draft and finalize when ready. `latestVersionNumber` is still set to 1 inside the transaction so `findRandomPublic` and the family-card queries see the forked model immediately.

## Domain factories

### `createForkedModel`

Distinct from `createModel` so the defaults are obvious at the call site. `createModel` accepts an optional `parentModelId` / `parentVersionNumber`, which made sense when fork was hypothetical; with a real fork path, the patch should call a factory that *requires* parent fields. This also lets `visibility` default to `'private'` for forks (vs `'public'` for `createModel`) without overloading a shared constructor.

```ts
createForkedModel(props: {
  id: string;
  parentModelId: string;
  parentVersionNumber: number;
  visibility?: ModelVisibility;
}): Model {
  const now = new Date();
  return {
    id: props.id,
    latestVersionNumber: null,
    parentModelId: props.parentModelId,
    parentVersionNumber: props.parentVersionNumber,
    visibility: props.visibility ?? 'private',
    isEndorsed: false,
    isLibraryModel: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    legacyId: null,
  };
}
```

Note that the patch passes a pre-generated `id` so the same UUID can be used for the S3 path prefix *before* the row exists. `createModel` generates internally; `createForkedModel` accepts externally. Keep both; they have different contracts on purpose.

### `createVersion` extension

`modelVersionDomain.createVersion` already exists. Extend its props to accept optional `netlogoVersion?: string | null` and `infoTab?: string | null`, defaulting to `null` when not provided. Existing callers (`ModelVersionService.create`) don't pass either, so behavior is unchanged. The fork patch passes both from the source version so the forked snapshot is faithful.

## S3 copy helper

`file.service.ts` does not currently expose a copy. The storage layer re-exports `CopyObjectCommand` from `@aws-sdk/client-s3` (see `src/shared/storage/index.ts`), so the wiring is one method.

Proposed signature:

```ts
async copy(
  srcKey: string,
  params: { pathPrefix?: string; filename?: string }
): Promise<{ key: string }>
```

Implementation:

1. Resolve `filename`: if caller supplies one, use it; otherwise derive from the last segment of `srcKey`.
2. Build `destKey = createStorageKey(filename, params.pathPrefix ?? '')`. This reuses the same date-partitioned, random-prefixed key layout that uploads use, so forks land in the same shape as fresh uploads.
3. Resolve ACL: forks of private models stay private; forks of public objects stay private too in this MVP (visibility is on the Model, not the S3 ACL — we already treat the `.nlogox` as private and serve it via signed URLs). So `ACL: 'private'`.
4. `storage.send(new CopyObjectCommand({ Bucket: bucket.Name, CopySource: `${bucket.Name}/${srcKey}`, Key: destKey, ACL: 'private', MetadataDirective: 'COPY' }))`.
5. Return `{ key: destKey }`.

No `Dependencies` changes; `fileService` already exposes its existing methods. Add this one to the returned object literal.

Reading the source `srcKey` requires URL-encoding the path component of `CopySource` if the key can contain spaces or special chars — `createStorageKey` sanitizes filenames so this is unlikely, but wrap `CopySource` in `encodeURIComponent` per segment to be safe (or just `encodeURI`).

## Orphaned S3 objects

S3 copy happens before the transaction. If the transaction fails (DB unavailable, unique constraint, whatever), the new S3 object exists with no row pointing at it. Trade-offs:

- Doing the copy *inside* the transaction is impossible — S3 is not transactional with PG.
- Doing the copy *after* the transaction means the row references a key that doesn't exist yet, with a window where reads 404.
- Pre-txn copy + orphan-tolerant cleanup is the standard pattern and is what we pick.

Mitigation: log a structured warning when the transaction fails after a successful copy (`logger.warn({ orphanedKey, sourceModelId, sourceVersionNumber }, 'fork txn failed; S3 object orphaned')`). Long-term cleanup is delegated to an S3 lifecycle rule on `uploads/models/*/versions/**` that deletes objects whose key has no matching `modelVersion.netlogoFileKey` after N days. Not in scope for this PR — flagging it as a follow-up.

## Tests

### Unit — `src/modules/model/patches/fork-model.patch.spec.ts`

Each case wires the patch with mock repositories and a fake `transactionManager` (the existing mock pattern from `model.service.spec.ts`):

- happy path: source loaded, version finalized, copy succeeds, txn commits. Asserts the new model id is returned and all four repo methods (`modelRepository.insertTx`, `modelVersionRepository.insertTx`, `modelAuthorRepository.insertTx`, `eventRepository.insert`) were called inside the same txn context.
- refusal: source model is soft-deleted → `CannotForkDeletedModelError`, no S3 call, no DB call.
- refusal: source version doesn't exist → `VersionNotFoundError`, no S3 call.
- refusal: source version is a draft (`finalizedAt = null`) → `CannotForkDraftVersionError`, no S3 call.
- defaults: empty body produces `title = '${source.title} (fork)'`, `description = source.description`, `visibility = 'private'`.
- overrides: each body field, when supplied, is used as-is.
- author role: `modelAuthorRepository.insertTx` called with `{ role: 'owner', userId: callerId }`.
- event payload: `{ type: 'model.forked', actorId: callerId, resourceType: 'model', resourceId: newModelId, payload: { sourceModelId, sourceVersionNumber } }`.
- S3 failure short-circuits: `fileService.copy` throws → no `insertTx` calls, error propagates.
- DB failure leaves S3 orphaned: `transactionManager.run` throws → `logger.warn` called with the new key; error propagates.

### Unit — extend `src/modules/model/domain/model.domain.spec.ts`

- `createForkedModel` sets the parent fields exactly as passed.
- defaults `visibility` to `'private'` when omitted.
- generates a fresh `createdAt`/`updatedAt`; `deletedAt` null; `legacyId` null.

### Unit — extend `src/modules/model-version/domain/model-version.domain.spec.ts`

- `createVersion` with new optional `netlogoVersion` and `infoTab` props sets them on the entity.
- when omitted, both fields remain `null` (existing behavior preserved).

### Integration — `tests/integration/model-fork.test.ts`

End-to-end against a real DB and the test S3 stub (whatever the existing integration suite uses). Steps:

1. Seed a model owned by user A with one finalized version (title `'Original'`, description `'...'`, an info tab, a netlogo version, a stored `.nlogox`).
2. Sign in as user B.
3. `POST /v1/models/:id/versions/1/fork` with empty body.
4. Assert: 201 and body `{ id: <uuid> }`.
5. Fetch the new model: `parentModelId = A's model id`, `parentVersionNumber = 1`, `visibility = 'private'`, `latestVersionNumber = 1`.
6. Fetch the new version: `title = 'Original (fork)'`, `description = 'same'`, `infoTab = same`, `netlogoVersion = same`, `previewImage` bytes equal, `netlogoFileKey != source key` and resolves via S3 (HEAD ok).
7. Query `ModelAuthor`: exactly one row, `userId = B`, `role = 'owner'`.
8. Query `Event`: exactly one new row, `type = 'model.forked'`, `actorId = B`, `resourceType = 'model'`, `resourceId = new model id`, `payload = { sourceModelId, sourceVersionNumber: 1 }`.
9. Negative case: POST `/v1/models/:id/versions/99/fork` → 404 `VersionNotFoundError`.
10. Negative case: POST against a draft version (create a second version, don't finalize) → 409 `CannotForkDraftVersionError`.

## Open questions

- Should soft-deleted / banned users be able to fork? Better-auth's `requireAuth` should already reject banned sessions. Confirm before merge; if it doesn't, add an explicit check.
- Should a model owner be able to opt out of being forked (an `isForkable` flag on `Model`)? Defer. None of the existing UX surfaces this.
- Should the forker auto-follow the source model so they get a notification if the source publishes new versions? Out of scope. Flag for the notifications plan.
- Should fork be rate-limited per-user? Defer; the global rate-limit plugin already applies. If we see abuse, tighten on this route specifically.
- Convenience `POST /v1/models/:id/fork` that forks from the latest finalized version? Considered and dropped. Revisit if the frontend asks for it; the explicit-version URL is fine for now because the fork UI naturally lives on a version page.
- Should `previewImage` be copied as bytes (current plan) or re-rendered? Copy as bytes — keeps the fork point-in-time faithful and avoids the preview-image pipeline. Re-render only if the source's preview is missing; even then, leave it null and let the user upload one.
