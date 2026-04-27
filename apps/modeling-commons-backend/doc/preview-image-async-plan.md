# Plan: async preview image generation for draft uploads

## Context

When a user uploads a `.nlogox` during the new draft flow, we want a PNG
preview of the first view rendered automatically. The renderer is the
existing `NETLOGO_SERVICES_ENDPOINT/preview` lambda, which is:

- Already wrapped by
  `src/modules/preview-image/preview-image.service.ts` —
  `generatePreviewImageFromModelVersion` takes a `ModelVersion`, signs
  the `.nlogox` S3 URL, calls the lambda, returns PNG `ArrayBuffer`.
- Cold-start, latency highly variable. Cannot block the upload request.

Today nothing calls this service — previews are only produced when a
user manually attaches one. After publish, `ModelVersion.previewImage`
(Bytes) is exposed at
`GET /v1/models/:id/versions/:version/preview-image`.

We want:
1. Preview generation kicks off automatically when the primary file
   lands in draft staging.
2. If the lambda returns before the user publishes, the upload UI shows
   the preview live.
3. If it doesn't, publish goes ahead without it and the preview fills
   in post-publish.

## Approach

### Backend

**Reuse** `previewImageService`; extend it with an S3-key-driven
variant so draft staging keys can be used before any `ModelVersion`
exists.

1. Refactor `preview-image.service.ts`
   - Add `generateFromNetlogoKey(netlogoFileKey: string)` — mirrors the
     signed-URL + lambda fetch path of the existing method but takes a
     raw S3 key. Existing `generatePreviewImageFromModelVersion` calls
     through to it.

2. New pg-boss queue `generate-preview` (handles both draft and
   published targets)
   - Worker file: `src/workers/preview-generator.ts` (mirrors
     `src/workers/model-draft-janitor.ts` for startup shape).
   - Discriminated payload:
     `{ kind: 'draft'; draftId: string }` or
     `{ kind: 'version'; modelId: string; versionNumber: number }`.
   - `kind: 'draft'`:
     1. Load draft via `modelDraftRepository.findById`.
     2. Read `data.primaryFile.s3Key` (upcast first).
     3. Call `previewImageService.generateFromNetlogoKey(s3Key)`.
     4. PUT the PNG to `staging/<userId>/<draftId>/preview.png` using
        the existing `storage`/`bucket` deps.
     5. PATCH the draft's JSON with
        `data.previewImage = { s3Key, contentType, generatedAt }` and
        `data.previewImageStatus = 'ready'` via
        `modelDraftRepository.updateDataTx`.
   - `kind: 'version'`:
     1. Call `previewImageService.generatePreviewImageFromModelVersion`
        (already exists — takes modelId + versionNumber).
     2. Write Bytes via new
        `modelVersionRepository.setPreviewImage(ctx, modelId,
        versionNumber, bytes)`.
   - On failure: for draft payloads, write
     `data.previewImageStatus = 'failed'` with `error` so FE stops
     polling. pg-boss retry policy: 2 retries, 30s backoff; final
     failure is terminal.

3. Enqueue on primary file upload
   - In `model-draft.service.ts#addFile`, when `role === 'primary'`, at
     the end of `persistData`, set
     `data.previewImageStatus = 'pending'` and enqueue the job. Do NOT
     await the preview result — return the `StagedFile` immediately.
   - When primary is replaced, clear any prior `data.previewImage`
     before re-enqueue.
   - When primary is removed, clear `data.previewImage` and
     `data.previewImageStatus`.

4. Expose preview during draft phase
   - Extend `schemas/v1.ts` `DraftDataV1`:
     `previewImage?: { s3Key, contentType, generatedAt }`,
     `previewImageStatus?: 'pending' | 'ready' | 'failed'`.
   - `modelDraftMapper.toResponse` already upcasts `data` so both
     fields will surface on `GET /v1/model-drafts/:id`. Also mint a
     signed URL (`previewImageUrl`) from `data.previewImage.s3Key` in
     the mapper or the route, since the FE can't use raw S3 keys.

5. Publish flow
   - In `model-draft.service.ts#publish`:
     - If `data.previewImage.s3Key` exists and status is `'ready'`,
       download bytes via `fileService.download` and set
       `version.previewImage` (Bytes) inside the existing transaction.
       Staging prefix is already wiped post-commit.
     - Otherwise (pending / failed / absent), publish without a
       preview and enqueue a `{ kind: 'version' }` job on the same
       queue so the ModelVersion eventually gets a preview.

6. Backfill for existing published models without preview
   - Because the user asked that "models that don't have preview
     images" also get one: add an idempotent enqueue step in
     `publish()` that always checks — if new version ends up with
     `previewImage == null`, push a `kind: 'version'` job.
   - Skip a full historical backfill sweep in this change; if needed,
     expose a one-off admin Bash snippet / query later.

### Frontend

1. `useModelDraft.ts` — already polls `GET /v1/model-drafts/:id` via
   `load()`. Add a thin poll helper designed to be swappable for
   socket push later:
   `watchPreview(intervalMs = 2500, timeoutMs = 60_000)`:
   - Shape: `(onReady: (url: string) => void, onFailed: () => void)`
     — the event-style API means a socket version can drop in without
     touching callers.
   - Kicks in after `uploadPrimaryFile` resolves with
     `previewImageStatus === 'pending'`.
   - Refetches the draft each tick; calls `onReady(url)` when
     `previewImageStatus === 'ready'`; calls `onFailed()` on
     `'failed'` or after timeout.
   - Cancellable via returned `stop()` / `AbortController` so the
     page can cancel on unmount.

2. `pages/models/upload.vue`
   - After `uploadPrimaryFile(file)` in the `formState.nlogoxFile`
     watcher, call `watchPreview()`; store the resolved URL in a local
     `previewImageUrl` ref.
   - Bind the sidebar `ModelCard`'s `image-url` to that ref when it's
     set (falling back to `URL.createObjectURL(imageFile)` if the user
     also attached an image — user-supplied wins).
   - Show a small "Generating preview…" caption while pending.

3. No new type generation needed yet — keep `useModelDraft.ts` on raw
   `fetch`, migrate to `useApi()` after `yarn generate:types` picks up
   the new draft response fields.

## Files touched

Backend:
- `src/modules/preview-image/preview-image.service.ts` — add
  `generateFromNetlogoKey`.
- `src/modules/model-draft/schemas/v1.ts` — extend `DraftDataV1`.
- `src/modules/model-draft/model-draft.service.ts` — enqueue on
  primary upload; download preview bytes on publish; re-enqueue
  post-publish when pending.
- `src/modules/model-draft/model-draft.mapper.ts` — add
  `previewImageUrl` on response (signed S3 URL).
- `src/modules/model-version/database/model-version.repository.ts` +
  `.port.ts` — new `setPreviewImage(ctx, modelId, versionNumber,
  bytes)`.
- `src/workers/preview-generator.ts` — new pg-boss worker.

Frontend:
- `app/composables/useModelDraft.ts` — new `watchPreview` helper,
  expose `previewImageUrl` on draft type.
- `app/pages/models/upload.vue` — wire `previewImageUrl` into the
  sidebar `ModelCard`, show pending caption.

## Verification

1. Start the backend against a real S3 + `NETLOGO_SERVICES_ENDPOINT`.
2. Upload a `.nlogox` in `/models/upload`; confirm:
   - Draft file upload returns immediately.
   - A `generate-preview` pg-boss job appears; worker logs success.
   - `GET /v1/model-drafts/:id` returns
     `data.previewImageStatus === 'ready'` and a `previewImageUrl`.
   - The upload page sidebar switches from the placeholder to the
     lambda-rendered PNG within a few seconds.
3. Kill `NETLOGO_SERVICES_ENDPOINT`; upload again — confirm job retries
   then writes `data.previewImageStatus === 'failed'`; FE stops
   polling; publish still works; post-publish retry also marks failed.
4. Publish while preview is still `'pending'` — confirm
   `ModelVersion.previewImage` is initially null, then populated after
   the post-publish worker runs (check
   `GET /v1/models/:id/versions/:version/preview-image`).
5. Replace the primary file mid-draft — confirm the old preview is
   cleared and a fresh one generates.
