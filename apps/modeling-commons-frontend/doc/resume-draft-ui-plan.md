# Resume Draft UI Plan

Companion to backend `resume-draft-fix-plan.md`. This is a frontend-only fix — backend is correct. The "Resume editing" link on `/profile/drafts` currently lands the user on the upload page with an empty form because the page never reads the loaded draft into its refs.

## Root cause (recap)

`pages/models/upload.vue` calls `useModelDraft().load(id)` on mount. `load()` populates the composable's internal `draft` ref, but the page never destructures or reads it. Form refs stay at defaults and the editor's `v-if` gate keeps the empty-state modal showing instead of the form.

## Changes

### 1. Destructure `draft` from `useModelDraft`

Add `draft` to the destructure in `pages/models/upload.vue`. Hydration reads from `draft.value`.

### 2. Hydrate page refs from `draft.value` after `load()`

A guarded `onMounted` pass:

- Set a `hydrating = ref(false)` to true at the start.
- Await `load(initialDraftId)`.
- Read `draft.value?.data` and copy into:
  - `formState.title`
  - `formState.description`
  - `formState.permission` (visibility)
  - `formState.tags` (split into tags / usecases — see [Tag split](#tag-split) below)
- Populate `stagedPrimary` from `draft.data.primaryFile` if present.
- Populate `stagedAttachments` from `draft.data.attachments`.
- On error: toast `Draft not found. Starting fresh.` and let the empty-state modal show.
- `await nextTick()` then set `hydrating = false`.

### 3. Suppress autosave echoes during hydration

Every field watcher that calls `patch(...)` gates on `!hydrating.value`. The pattern:

- `watch(() => formState.title, (v) => { if (hydrating.value) return; void patch({ title: v }); })`.
- Same for `description`, `permission`, `tags`, `subjects`, `usecases`.

The `nlogoxFile` watcher doesn't need a guard because hydration never assigns a `File` to it (we have a staged primary, not a `File` object).

### 4. Relax the editor template gate

The current `v-if="!formState.nlogoxFile"` hides the editor when there's no local file. On resume, a staged primary is just as valid:

```vue
<div v-if="!formState.nlogoxFile && !stagedPrimary" class="...">
  <!-- empty-state upload modal -->
</div>
<div v-else class="...">
  <!-- stepper / form / publish -->
</div>
```

### 5. Right-rail primary file display

Today the right rail renders a `NetlogoFileUpload` bound to `formState.nlogoxFile`. On resume that's null but a primary is staged. Showing a fresh-upload prompt is misleading.

When `stagedPrimary` is set and `formState.nlogoxFile` is null, render a staged-file block:

- Filename (truncated).
- `Replace` action that clears `stagedPrimary`, calls `removeFile(prior.fileId)`, and reveals the standard `NetlogoFileUpload` slot. Picking a new file triggers the existing watcher path → `uploadPrimaryFile`.

Pre-ship gate: confirm with backend that `POST /v1/model-drafts/:id/files` with `role=primary` when a primary already exists either replaces or 409s. If it silently appends, the backend needs a small fix; flagged in the backend plan's open questions.

### 6. Attachments list rendering

`FileUploadCard.vue` accepts `modelFiles` / `additionalFiles` as `File[]`. On resume those are empty but `stagedAttachments` has entries. Two options:

- **Shortest fix:** pass `stagedAttachments` in as a separate prop and render staged entries alongside the local `File[]` list. Each staged row has a `Remove` button that calls `removeFile(fileId)`.
- **Longer-term:** collapse both into a single `StagedFile[]` model and convert each local file to a staged entry immediately on upload success. Better invariant ("server is source of truth"), more code churn.

**Recommendation:** shortest fix now. Migrate to `StagedFile[]` when the upload redesign work tightens the model anyway.

### 7. `formState.nlogoxFile = null` reset guard

The existing watcher resets `formState` to defaults whenever `nlogoxFile` becomes null. On resume `nlogoxFile` starts null and never changes, so the watcher doesn't fire. After §5's `Replace` clears `stagedPrimary`, the user's typed title/description must survive. Current behavior is fine (null → null is a no-op). Worth a one-line comment in the watcher so a future edit doesn't regress it.

## Tag split

`draft.data.tags` is a flat `string[]`. The UI splits into `tags` and `usecases` via a `usecase:` prefix:

- `"usecase:climate-modeling"` → `usecases[]` (stripped of prefix).
- everything else → `tags[]`.

`collectTagNames` (existing util) does the reverse on the way out. This is a known limitation called out in the backend plan: `subjects` can't be restored as separate, since the existing API flattens them. Acceptable for v1; a future schema change to `draft.data` can persist the three buckets explicitly.

## Test path

1. Start a fresh upload. Pick `.nlogox`, fill title/description/tags, add an attachment. Let autosave settle (`Saved` indicator).
2. Navigate to `/profile/drafts`. Confirm the draft appears with the correct title.
3. Click `Resume editing`.
4. **Expected:** editor visible (not the empty-state modal), title/description/tags populated, primary shown in the right rail as a staged file, attachment listed in the Files step.
5. Edit the title. **Expected:** `Saving…` then `Saved`.
6. Click `Replace` on the primary. Pick a new `.nlogox`. **Expected:** old primary removed server-side, new one uploaded.
7. Remove an attachment. **Expected:** gone server-side (verify via page refresh).
8. Publish. **Expected:** success and redirect to `/models/<id>`.
9. Back on `/profile/drafts`, confirm the draft row is gone.

## Open questions

- **Preview image on resume:** see `preview-image-async-ui-plan.md` — if the draft has a `previewImageUrl` already, set it immediately. If `previewImageStatus === 'pending'`, start `watchPreview`. This integrates cleanly with the hydration pass.
- **Tag/subject schema persistence:** the flat-tags loss is acceptable for now; a `draft.data.subjects` + `draft.data.usecases` triple-bucket would eliminate the split-on-read. Defer.
- **Single `StagedFile[]` model for files:** flagged for the broader upload-redesign work; not necessary for this fix.

## Out of scope

- Replacing the two-list `FileUploadCard` API with a unified `StagedFile[]`.
- Preserving `tags` vs. `subjects` distinction through round-trip.
- Multi-tab concurrent edits to the same draft. Last write wins.
- "Discard changes since last save" (no local diff exists; autosave is the model).

## Reuse checklist

- `composables/useModelDraft.ts` — destructure `draft`.
- Existing `formState`, `stagedPrimary`, `stagedAttachments` refs.
- `components/upload/NetlogoFileUpload.vue` (with the staged-file mode).
- `components/upload/FileUploadCard.vue` (with the staged-list prop).
- `useToast()` for the "Draft not found" fallback.
