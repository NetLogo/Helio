# Model Upload UI Plan

Companion to backend `model-upload-redesign-plan.md`. The backend introduces a `ModelDraft` aggregate so no `Model` row exists until publish. This is the frontend side of that flip.

A draft `.frontend.md` already lives in the backend doc folder with implementation-level detail; this file is the higher-level UI plan for the frontend repo.

## Backend surface

All under `/v1/model-drafts`, auth required:

- `POST /v1/model-drafts` — create empty draft. Body `{ modelId? }` (for "new version" flow).
- `GET /v1/model-drafts` — list current user's drafts.
- `GET /v1/model-drafts/:id` — read one; backend upcasts `data` to latest schema.
- `PATCH /v1/model-drafts/:id` — merge-patch form fields (not file fields).
- `POST /v1/model-drafts/:id/files` — multipart, with `role: 'primary' | 'attachment'`.
- `DELETE /v1/model-drafts/:id/files/:fileId` — remove a staged file.
- `POST /v1/model-drafts/:id/publish` — materialize `Model` + `ModelVersion`, return `{ id }`.
- `DELETE /v1/model-drafts/:id` — abandon.

## Current state (what changes)

`pages/models/upload.vue` and `composables/useUploadModel.ts` (legacy) eagerly create a `Model` row the moment a file is picked. That's the bug. The frontend already has scaffolding for the new flow:

- `pages/models/upload.vue` — 4-step stepper exists (files → details → permissions → peer-review).
- `pages/profile/drafts/index.vue` — drafts list exists.
- `composables/useModelDraft.ts` — exists in some form (per inventory).

This plan replaces the eager-create paths and aligns the existing composable with the new backend.

## Target UX

1. User lands on `/models/upload`. No network calls yet.
2. Drops a `.nlogox`. **Now** a `ModelDraft` is created and the file is uploaded to staging. No `Model` exists.
3. User fills in fields. Each change debounces a `PATCH` to the draft. A "Saving…" / "Saved" indicator near the stepper signals the autosave.
4. Additional files / images upload to draft endpoints as they're selected.
5. On the final step, **Publish**: strict client-side validation, then `POST /v1/model-drafts/:id/publish`. Server materializes `Model` + `ModelVersion`, redirect to `/models/:id`.
6. Tab close mid-flow leaves the draft on the server. Revisit via `/profile/drafts` → resume.

Key shifts:

- "Save as draft" is **not a button** — autosave is implicit. The explicit action is **Publish**.
- The model URL doesn't exist until publish returns.
- No `isDraft` flag anywhere on `Model` / `ModelVersion`.

## Composable: `useModelDraft`

Owns draft id, debounced patches, file ops, publish. Returns `{ draftId, draft, saving, publishing, ensureDraft, load, patch, uploadPrimaryFile, uploadAttachment, removeFile, publish, abandon }`.

Behaviors (intent, not signatures):

- **`ensureDraft` is lazy.** Created on the first real mutation — first field edit or first file pick — not on page mount. Cheap to open `/models/upload`.
- **`patch` is debounced** (~500ms) and merges by field. The Vue page owns form state; the composable just syncs.
- **File ops are NOT debounced** — every add/remove is an immediate round trip because S3 is the side effect and the user expects visible progress.
- **Validation lives in the page**, not the composable. Drafts accept anything; only publish enforces the strict schema.
- **No `modelUrl` ref.** Caller navigates after `publish()` returns the id.

## Page rewrite

`pages/models/upload.vue` reads optional `?draft=<id>` from the URL. With a draft id, it hydrates form refs from the loaded draft (see `resume-draft-ui-plan.md` for the hydration details). Without, it starts fresh.

Watchers (high level):

- `formState.title`, `description`, `tags`, `visibility`, etc. → `patch({...})`.
- `formState.nlogoxFile` → `ensureDraft()` then `uploadPrimaryFile(file)` then `patch({...})` for fields scraped from the file (`title` defaults to filename without extension; `description` from info-tab first paragraph).
- Attachments and images select → `uploadAttachment(file)`.

Publish:

- `await patch.flush()` to land the last debounced edit.
- `await patch({ visibility })` to commit the visibility choice.
- `await publish()` and navigate to `/models/${result.id}`.

## File staging UI

The two arrays today (`modelFiles` and `additionalFiles` as `ref<File[]>`) become arrays of `StagedFile = { fileId, filename, status, localFile? }`. The server is the source of truth; local files are transient state during the upload.

Per-file states in the file cards:

- `uploading` — spinner, no remove affordance.
- `uploaded` — filename, size, remove (`DELETE .../files/:fileId`).
- `failed` — filename, retry, remove (clears local).

Components touched:

- `components/upload/NetlogoFileUpload.vue` — emits to the page; page calls `uploadPrimaryFile`.
- `components/upload/FileUploadCard.vue` — accepts staged files alongside local, renders both.
- `components/upload/FileUploader.vue` — the generic drag/drop input; unchanged.
- `components/upload/ImageUploader.vue` — same shape as attachments; treat the image as an attachment with a known `role` (or a dedicated `image` role if the backend exposes one).

## Drafts list (`/profile/drafts`)

Already a route. Wire to `GET /v1/model-drafts` for the current user.

Per row: title (or `"Untitled draft"`), `updatedAt`, primary filename if present, **Resume** (→ `/models/upload?draft=<id>`) and **Delete** buttons.

Optional banner on `/models/upload`: "You have 2 drafts — resume?" linking to `/profile/drafts`. Small `UAlert` with a dismiss.

## Tags

Today's flow `addTag`s one by one after model creation. New flow: tags live in `draft.data.tags` and are passed as part of publish. No tag-by-tag API call. The backend's publish handler creates tag rows. Removes the "tag failed silently" `.catch(() => null)` from old `submit()`.

## Abandon

- **Explicit:** "Discard draft" button on the page calls `abandon()` → `DELETE /v1/model-drafts/:id` → navigate to `/models`.
- **Implicit:** user closes the tab. Backend janitor reaps after 90 days. Frontend does nothing on `beforeunload`.

## Saving / Saved indicator

A small inline indicator near the stepper header:

- `saving` (composable ref true) → `Saving…` with a small spinner.
- `saving` false and the last patch succeeded → `Saved · {relative time}`.
- Last patch failed → `Save failed — retrying` (after one retry), then `Save failed` (drop and let the user move on; next patch reattempts).

Mirrors Google Docs feedback so the user trusts that leaving the page is safe.

## Error + retry

- Patch failures retry once internally; second failure toasts non-blocking. The user keeps editing — the next patch sends the latest value.
- File upload failures are per-file in the card with a `Retry` affordance.
- Publish failures surface as a blocking dialog with `Try again` / `Cancel`. Strict validation errors render inline at the bottom of the stepper with a link back to the offending step.

## Permissions / visibility

Permissions step keeps its existing UI (`SetPermissionsCard.vue`) — visibility selector, license, peer-review toggle, co-author select. The visibility chosen there is what gets sent in the publish payload (`patch({ visibility })` just before publish).

## Migration plan

1. Land backend `ModelDraft` endpoints.
2. Build / align `useModelDraft` composable + ensure `/profile/drafts` is wired.
3. Rewrite `/models/upload` to use it. Delete `useUploadModel.ts`.
4. Grep and remove leftover `submitDraft` / `createModel` / `modelUrl` references.
5. Once FE is off the old endpoints, backend can drop `ModelVersion.isDraft`.

## Tradeoffs accepted

- **Debounced autosave loses up to 500ms of typing** on a browser crash. The alternative is per-keystroke (chatty) or on-blur (feels sluggish).
- **No optimistic local ids.** First mutation gates on `ensureDraft` resolving. The first POST is fast; gating is simpler than reconciling local IDs.
- **No offline mode.** A flow that starts with a network-heavy file upload doesn't need IndexedDB queueing.

## Out of scope

- Multi-tab same-draft conflict resolution. Last write wins. Document this if it becomes a real complaint.
- Cross-device draft sync (already covered — drafts are server-resident).
- Versioned draft history. The draft is one row; previous typed values are not recoverable.

## Open questions

- **Primary file replacement semantics on the backend** — does `POST .../files` with `role=primary` when one already exists 409 or replace? Confirm with backend; UI assumes replace (see `resume-draft-ui-plan.md` §5 for the relevant note).
- **Image upload role** — is it an `attachment` with a special filename, or a distinct `role: 'image'`? Confirm; UI is currently set up to treat as attachment.
- **Schema versioning surface** — backend upcasts on read. UI doesn't need to know the version. Confirm we never need to surface "this draft was saved on an older schema; some fields cleared" to the user.

## Reuse checklist

- Existing 4-step stepper in `pages/models/upload.vue`.
- `components/upload/*` — all existing cards.
- `pages/profile/drafts/index.vue` for the list.
- `useToast()` for non-blocking errors and publish success.
- `handleApiError` for normalized error messages.
- `UStepper` from Nuxt UI.
