# Model Upload Redesign Plan

Rethinks model uploads so in-progress work never touches `Model` / `ModelVersion`. Enables a "save draft and come back later" feature as a byproduct.

## Why

Two symptoms of the same bug:

1. **Drafts leak into search and listings.** `upload.vue:195` fires `submitDraft()` the moment a user picks a `.nlogox`, creating a real `Model` row. `model.repository.ts:65-130` never filters `isDraft` / `finalizedAt`, so the half-built model shows up wherever visibility permits.
2. **File upload is coupled to form submit.** `useUploadModel.ts` file endpoints require a `modelId`, which is why we eagerly create the Model in the first place.

Fixing the filters is a patch. The real fix is: **if a row exists in `Model`, it is published.** In-progress uploads live in a separate table.

## Invariant

- `Model` and `ModelVersion` rows only exist post-publish.
- No `isDraft` anywhere. Drop `ModelVersion.isDraft`.
- Keep `ModelVersion.finalizedAt` — unrelated to drafts; it's the "freeze this version from further edits" flag.
- Public queries do not need special draft filters. The staging table is the filter.

## Schema

One table, JSONB-backed, versioned.

```prisma
model ModelDraft {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Set when drafting a new version of an existing model. Null for first-time uploads.
  modelId       String?
  model         Model?   @relation(fields: [modelId], references: [id], onDelete: Cascade)

  schemaVersion Int
  data          Json

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
  @@index([modelId])
}
```

### `data` shape (v1)

Validated in the service with a Typebox schema per `schemaVersion`.

```ts
{
  title?: string
  description?: string
  visibility?: 'public' | 'private' | 'unlisted'
  tags?: string[]
  primaryFile?: { s3Key, filename, sizeBytes, mimeType }
  attachments?: Array<{ id, s3Key, filename, sizeBytes, mimeType }>
}
```

All fields are optional on the draft schema. The strict schema used at publish time is separate and stricter (e.g. `primaryFile` required, `title` required).

## Module layout (`src/modules/model-draft/`)

Mirrors the standard module skeleton from the backend CLAUDE.md.

- `domain/model-draft.domain.ts`, `.errors.ts`, `.types.ts`
- `database/model-draft.repository.{ts,port.ts,mock.ts}`, `.record.ts`
- `dtos/` — request/response Typebox schemas
- `schemas/v1.ts`, `schemas/index.ts` (exports `upcast(data, fromVersion) → latest` and the latest strict schema)
- `model-draft.service.ts`
- `model-draft.route.ts`
- `model-draft.mapper.ts`
- `index.ts` — awilix registrations

## Endpoints

All under `/v1/model-drafts`, `preHandler: [requireAuth]`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/model-drafts` | Create empty draft. Body: `{ modelId?: string }`. Returns `201 { id }`. |
| `GET` | `/v1/model-drafts` | List current user's drafts. Paginated. |
| `GET` | `/v1/model-drafts/:id` | Read one. Upcasts `data` to latest `schemaVersion` on read. |
| `PATCH` | `/v1/model-drafts/:id` | Merge-patch form fields into `data` (title, description, visibility, tags). **Not for file fields.** |
| `POST` | `/v1/model-drafts/:id/files` | Multipart upload. Body flag: `role: 'primary' | 'attachment'`. Writes to S3, appends/sets in `data`. |
| `DELETE` | `/v1/model-drafts/:id/files/:fileId` | Remove from `data` and from S3. |
| `POST` | `/v1/model-drafts/:id/publish` | Validate strictly, materialize `Model` + `ModelVersion`, move S3 objects, delete draft. |
| `DELETE` | `/v1/model-drafts/:id` | Abandon draft. Deletes S3 staging prefix and row. |

**File endpoints own both S3 and the JSON blob.** Never let clients PATCH file fields via the generic `PATCH` — it's the one way the blob desyncs from S3.

## S3 layout

- Staging: `staging/<userId>/<draftId>/<uuid>-<filename>`
- Permanent (unchanged): existing `ModelVersion.netlogoFileKey` convention.

`userId` in the staging prefix so an IAM misconfig can't cross tenants. Janitor can `ListObjectsV2` by `staging/` prefix as a reconciliation pass against `ModelDraft` rows.

## Publish flow

```ts
transactionManager.run(async (ctx) => {
  const draft = await modelDraftRepository.findById(ctx, draftId)
  const data = upcast(draft.data, draft.schemaVersion)
  assertValid(strictPublishSchema, data)  // throws if missing required fields

  const model = draft.modelId
    ? await modelRepository.findById(ctx, draft.modelId)
    : await modelRepository.insertTx(ctx, buildModelFromDraft(data, userId))

  const version = await modelVersionRepository.insertTx(ctx, {
    modelId: model.id,
    netlogoFileKey: await moveToPermanent(data.primaryFile.s3Key, model.id),
    // ...
    finalizedAt: new Date(),
  })

  for (const att of data.attachments ?? []) {
    await moveToPermanent(att.s3Key, model.id)
    // insert attachment row
  }

  await eventRepository.insert(ctx, {
    type: draft.modelId ? 'model.version.created' : 'model.created',
    actorId: userId,
    resourceType: 'model',
    resourceId: model.id,
    payload: { draftId, versionId: version.id },
  })

  await modelDraftRepository.hardDelete(ctx, draftId)
})

// Post-commit, best-effort:
await s3.deletePrefix(`staging/${userId}/${draftId}/`)
```

S3 moves are CopyObject + DeleteObject; if the txn rolls back, the post-commit cleanup doesn't run and the janitor sweeps staging later. Permanent copies from a rolled-back txn are orphans — accept this or add a reverse-cleanup step on rollback.

## Schema versioning discipline

- `schemas/v1.ts` — current shape
- When the form grows a new field, add `schemas/v2.ts` + an `upcast_v1_to_v2(data)`
- Read path: always upcast to latest before handing to service
- Write path: always write latest version
- Never mutate an old version's shape in place

This is the one place the JSONB tax shows up. Pay it consistently or the blob becomes a swamp.

## Janitor

Weekly cron:

- Delete `ModelDraft` rows where `updatedAt < now - 90d` (policy TBD)
- For each deleted row, delete its `staging/<userId>/<id>/` S3 prefix
- Reconciliation: list `staging/` prefixes with no matching `ModelDraft` row and delete them

No `expiresAt` column — policy lives in the cron, easy to change without migration.

## Frontend changes

- `upload.vue:195-198` — remove the auto-fire `submitDraft()` on file select. Draft is created explicitly (e.g. first keystroke, or on demand).
- `useUploadModel.ts` — replace `createModel` / `createVersion` / `uploadAdditionalFile` calls with draft endpoints. Final step is `POST /v1/model-drafts/:id/publish`.
- New "My drafts" page listing `GET /v1/model-drafts` for resume.
- File upload UI can work the same — it just points at draft file endpoints.

## Migration / cleanup

1. Add `ModelDraft` table.
2. Build `model-draft` module + endpoints.
3. Switch frontend upload flow to drafts.
4. Backfill: any existing `Model` rows whose only version has `isDraft: true` — convert to `ModelDraft` or hard-delete with owner notification (pre-beta, so probably delete).
5. Drop `ModelVersion.isDraft` column.
6. Remove the `submitDraft()` / early-create code paths from service + frontend.

## Tradeoffs accepted

- **No referential integrity between `data.*.s3Key` and anything.** Trading it for iteration speed on form shape. The file endpoints are the only writers, which keeps drift manageable.
- **Orphan permanent S3 objects on publish-txn rollback.** Rare; janitor-style reconciliation can cover it if it becomes real.
- **JSONB means strict validation lives in code, not the DB.** That's the whole point — if we wanted DB-enforced shape, we'd use columns.
