# NanoID identifier migration

Status: proposed - not approved

Replace every UUID identifier in the Modeling Commons stack with NanoID: entity primary keys,
API contract validation, storage-key path segments, request/correlation ids, seed ids, and the
legacy-import scripts.

## Why this is cheaper than it looks

Every id column in the database is already `TEXT`. There is no Postgres `uuid` column type, no
`gen_random_uuid()`/`uuid_generate_v4()` default, and no `pgcrypto`/`uuid-ossp` extension anywhere
in `prisma/migrations/` (verified: grepping the whole migration tree for those tokens returns
nothing; `prisma/migrations/20260413204914_init/migration.sql:17` and every sibling declare
`"id" TEXT NOT NULL` with no `DEFAULT`).

UUID generation is entirely application-side. So this is a generator swap plus a validation-contract
change, not a column-type migration.

Prisma 7.6 supports `@default(nanoid())` natively (confirmed by running `prisma validate` against a
patched schema). Because Prisma scalar defaults are applied client-side in the query engine, changing
`uuid()` to `nanoid()` produces no SQL diff at all.

## Inventory

### Database (`prisma/schema.prisma`)

12 primary keys use `@default(uuid())`:

| Model | Line |
| --- | --- |
| User | 57 |
| Account | 106 |
| Session | 126 |
| Verification | 144 |
| Passkey | 158 |
| Model | 176 |
| ModelAdditionalFile | 255 |
| Tag | 270 |
| NonMemberContributor | 298 |
| ModelPermission | 314 |
| ModelInteraction | 342 |
| Event | 384 |

`ModelDraft.id` (366) is already `@default(cuid())` - the one outlier, folded into this migration for
consistency.

Four join tables carry composite `@@id` over UUID-typed FK columns and have no id of their own:
`ModelVersion` (237), `ModelVersionTag` (250), `ModelAuthor` (290), `ModelLike` (336). They migrate
implicitly with their parents.

These DB defaults are close to dead code: application code supplies an explicit `id` on every create
(`src/modules/model/database/model.repository.ts:69`, `.../model-interaction.repository.ts:15`, and
peers). The defaults matter only for Better Auth's own writes and direct SQL inserts.

### Generation sites (`src/`)

Entity ids via `crypto.randomUUID()`:

- `src/modules/model/domain/model.domain.ts:11`
- `src/modules/model-permission/domain/permission.domain.ts:15`
- `src/modules/tag/domain/tag.domain.ts:43`
- `src/modules/model-additional-file/domain/model-additional-file.domain.ts:11`
- `src/modules/model-interaction/domain/model-interaction.domain.ts:17`
- `src/modules/model-draft/domain/model-draft.domain.ts:15`
- `src/modules/model-draft/model-draft.service.ts:241,371` (draft file entries inside the JSON blob)

Storage-key path segments:

- `src/shared/storage/utils.ts:46` - `randomUUID().substring(0, 8)`, i.e. **32 bits of entropy** per
  key inside a `{path}/{YYYY}/{MM}/{DD}/` prefix. This is the weakest identifier in the codebase and
  the migration is a good moment to widen it.
- `src/modules/model-draft/model-draft.storage.ts:30` and the duplicate at
  `src/modules/model-draft/model-draft.service.ts:36,91`
- `src/modules/file/file.route.ts:50` - `` `${randomUUID()}-ua` ``

Request-scoped ids:

- `src/server/plugins/correlation-id.ts:11`
- `src/index.ts:15-22` (Fastify `genReqId`)

The `uuid` npm package is not a dependency anywhere in the monorepo; generation is exclusively
Node's built-in `crypto.randomUUID`. Neither `nanoid` nor `uuid` is a declared direct dependency in
any workspace `package.json`.

### Validation sites

- `src/shared/utils/validator.util.ts:18` registers Ajv `addFormats`, which is what actually enforces
  every `Type.String({ format: 'uuid' })` in the route schemas.
- `src/shared/api/id.response.dto.ts:5` - the shared `idDtoSchema` reused across modules.
- `src/shared/utils/validateUUIDv4.ts:1-5` - hand-rolled regex, used only for the correlation-id and
  request-id headers, never for entity ids.
- 19 DTO/schema files declare `format: 'uuid'` fields, producing 59 `Format: uuid` annotations in the
  generated OpenAPI client.

### Consumers outside the backend

- `client/rest.d.ts` and `apps/modeling-commons-frontend/shared/types/api.d.ts` are byte-identical
  generated artifacts from `yarn generate:types` (`scripts/generate-types.sh:30`, which boots the
  server and runs `openapi-typescript` against its live OpenAPI JSON, then copies to
  `CLIENT_TYPES_OUTPUT_DIR`). Both are committed. `format: uuid` appears there only as a JSDoc
  comment - the TS type is plain `string`, so nothing downstream breaks at compile time.
- The frontend contains **zero** uuid references outside that generated file. No route-param
  validation, no regexes, no generation.
- No other app or package in the monorepo touches uuid.

## Decisions

### Alphabet and length

Use `nanoid` v5 (ESM-only, matching `"type": "module"`) with the default 21-character URL-safe
alphabet `A-Za-z0-9_-`.

At 21 characters the collision probability is negligible at any volume this project will see, and the
alphabet is safe in URL path segments, S3 keys, and JSON without escaping.

Confirmed: use the library default rather than a custom base62 alphabet.

### Central id module

All generation and all validation route through one module, `src/shared/utils/id.ts`:

```ts
export const ID_LENGTH = 21;
export const newId: () => string;
export const ID_PATTERN: string; // '^[A-Za-z0-9_-]{21}$'
```

DTOs consume a Typebox helper built from these constants rather than repeating `format: 'uuid'`.
This is what keeps the contract from drifting again.

### Hard cutover, not a phased rollout

The project is in beta and a shock is acceptable, so there is no transitional window. Generation and
validation switch together in PR 2, and no UUID is ever accepted again.

The alternative - widen `idSchema` to accept both shapes, switch generation, then narrow again once
the data is clean - exists to keep a live system serving traffic mid-migration. That is not worth
buying here: it costs two extra PRs and leaves a permissive pattern lying around that something will
eventually start using.

What this does mean is that generation and validation **cannot be split**. Switching generation while
routes still demand `format: 'uuid'` makes every route reject the ids it just created; narrowing
validation first rejects everything the running code produces. PR 2 is therefore larger than the
others by design.

It also means PRs 2 through 4 ship as **one release**. Between PR 2 and the backfill in PR 4, the
schemas reject the UUIDs already in the beta database, so the intermediate state is not deployable.
Each PR still stands on its own against a fresh database, which is what the test suite runs against.

## Hazards

### Tag lookup discriminator (correctness, must fix)

`src/modules/tag/tag.service.ts:30` disambiguates "is this an id or a tag name?" by regex:

```ts
const isUuid = /^[\da-f]{8}-[\da-f]{4}-.../i.test(idOrName);
```

This is safe today only because no plausible tag name is UUID-shaped. A NanoID pattern
(`^[A-Za-z0-9_-]{21}$`) **collides with ordinary tag names** - any 21-character word-ish tag would be
misrouted to `findOneById` and 404. A shape test cannot survive this migration.

The fix is to stop guessing: look up by id, fall back to name on miss. This is PR 3, kept out of the
sweep because it is the one change here that a reviewer has to actually think about.

### Storage keys derived from legacy ids

`prisma/legacy-migration/lib/file-keys.ts:6-14` exposes `derivedUuid(namespace, id)` - a SHA-256 hash
of the legacy integer id, bit-forced into UUIDv4 shape. It is used at `apply-diff.ts:777` and
`apply-diff.ts:948` to build **S3 object keys** for version files and previews.

This is deterministic on purpose: re-running the incremental sync must land on the same key. If the
legacy import has already run against a real bucket, changing this function changes every computed
key and orphans the existing objects.

**Decided: freeze it.** Asset URLs are not user-facing and already look arbitrary, so there is
nothing to gain from NanoID-ifying a storage-path hash and a real risk in doing so. `derivedUuid`
keeps its exact output under a name that says what it is (`storagePathHash`), with a comment and a
pinned-output test so a later cleanup sweep cannot silently break it. This is the one deliberate
exception to "no UUID-shaped strings remain".

Ordinary storage keys *are* migrated: `createStorageKey`/`stagingKey` generate a fresh random segment
at write time and store the resulting key as an opaque string in `fileKey`/`s3Key`/`key` columns.
Nothing ever parses that segment back, so existing objects stay reachable regardless of what
generator produces new keys.

### Legacy import determinism

`prisma/legacy-migration/initial-import.ts` uses non-deterministic `randomUUID()` for every row id
(lines 175, 193, 261, 336, 406) and achieves idempotency through the `legacyId Int? @unique` columns
instead (`prisma/migrations/20260427185014_legacy_id/migration.sql:9-25`). There is no deterministic
legacy-int-to-uuid mapping to preserve. `node-migration.ts:41-47` already injects the generator as
`newUuid: () => string`, which is a clean seam.

### Request-id interop

`x-correlation-id` and the inbound `request-id` header are frequently UUIDs when they originate from
an upstream proxy or tracing system. Switching generation to NanoID is fine; the header *validator*
should keep accepting UUID-shaped inbound values rather than discarding a perfectly good trace id.
The `request-ids` commit accepts both and generates NanoID.

### Seed determinism

`prisma/seed/id.ts:15-24` derives a UUIDv5-shaped id from a SHA-1 of a natural key so the seed is
idempotent under upsert-by-id. The determinism must survive; only the output encoding changes (hash
bytes mapped into the NanoID alphabet, 21 chars).

### Test-harness silent degradation

`tests/support/timing-collector.ts:23,33` normalizes URL path segments to `:id` using a UUID regex,
with a `HEX_ID_RE = /^[0-9a-f]{24,36}$/i` fallback that a NanoID will not match either. Perf reports
would silently stop collapsing ids and fragment into thousands of distinct routes. Not a production
bug, but it makes the perf profile useless, so it is in scope.

`tests/api/user.feature:26` hardcodes the nil UUID as a throwaway path param.

## Existing data: backfill required

Confirmed: existing data must survive, so there is no reset path. This makes the backfill the
largest and only genuinely risky part of the plan, and it is PR 4, split across two commits.

Its first commit builds a durable `_id_migration_map(table_name, old_id, new_id)` table, then
rewrites all 12 UUID primary keys plus `ModelDraft`'s cuid and every declared FK edge in one
transaction with deferred constraints. Four join tables carry those FK columns *inside* a composite
primary key
(`ModelVersion`, `ModelVersionTag`, `ModelAuthor`, `ModelLike`), which is the sharpest edge in the
migration.

Its second commit then uses that map for the two references no foreign key protects:

- `Event.resourceId` - a plain column holding model and user ids for the audit trail. It is remapped
  by `resourceType`, not by guessing which table an id came from. Note the repo convention that child
  aggregates record the *parent* resource type.
- `ModelDraft.data` - a versioned JSON blob whose `DraftFileV1` entries carry their own ids. Its
  compiled Typebox `Parse` runs a `Clean` step that strips properties absent from the schema, so a
  read-mutate-write through the schema silently drops data. The pass must operate on raw JSON.

Splitting on the mapping table is what makes that second commit reviewable on its own instead of one
enormous transaction, and it leaves an audit trail and a rollback path.

Rewriting `User.id` invalidates every `Session` row, so all users are logged out on deploy.
Externally shared model URLs also break. Both are inherent to the request and belong in the release
notes.

## PR breakdown

Four PRs, in `.ongoing/nanoid-ids/`. Merge order is the numeric suffix. The per-commit briefs live in
`.ongoing/nanoid-ids/commits/` and carry the file-by-file detail.

| # | File | Commits | Depends on |
| --- | --- | --- | --- |
| 1 | `foundation-1.md` | `id-module`, `prisma-defaults` | none |
| 2 | `sweep-2.md` | `switch-ids`, `request-ids`, `seed`, `legacy-migration`, `tests`, `docs` | 1 |
| 3 | `tag-lookup-3.md` | `tag-lookup` | 1 |
| 4 | `backfill-4.md` | `backfill-map-and-swap`, `backfill-soft-refs` | 2 |

Only three boundaries here earn a separation, and each is a different kind of review:

- **Inert vs. breaking.** PR 1 changes no behaviour, so PR 2's diff contains only the sweep.
- **Mechanical vs. behavioural.** PR 2 is verifiable by grep. PR 3 is the one place a reviewer has to
  think, and burying it in a 30-file find-and-replace is how it gets rubber-stamped.
- **Code vs. data.** PR 4 runs against the beta database and is the only step that can lose
  something. It needs a backup, a rehearsal against a restored dump, and verification queries rather
  than a test suite.

Everything else is one logical change and is packaged as commits, not PRs.

PRs 2 and 3 have disjoint file sets and can run in parallel. PR 4 is serialized after PR 2.

PR 2 is unavoidably large - roughly 30 files - because generation and validation cannot be split
without a transitional window. See "Hard cutover" above.

All of it ships as a single release: between PR 2 and PR 4 the schemas reject the UUIDs still in the
beta database, so intermediate states are testable against a fresh database but not deployable.

## Verification

Per commit: `yarn lint`, `yarn check-types`, `yarn deps:validate`, `yarn test:unit`.
Per PR additionally: `yarn test:e2e` (needs `yarn svc` and `yarn db:migrate:dev`).
Within PR 2: `yarn generate:types` and commit both regenerated artifacts.

Two intentional exceptions survive, each carrying a comment saying why: the frozen `storagePathHash`
function (and its pinned-output test) and the inbound request-header validator from the `request-ids` commit. Beyond
those, a final grep must return nothing outside `generated/`, `yarn.lock`, and this document:

```
grep -rin "uuid" src prisma tests client --include="*.ts" --include="*.prisma" --include="*.feature"
```
