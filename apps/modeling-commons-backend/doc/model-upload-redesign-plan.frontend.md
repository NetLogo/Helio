# Model Upload Redesign — Frontend Plan

Companion to `model-upload-redesign-plan.md`. Rewires the upload UX around the new `ModelDraft` endpoints so no `Model` row exists until the user explicitly publishes.

## Current state (what's wrong)

- `pages/models/upload.vue:186-205` — a `watch` on `formState.value.nlogoxFile` calls `submitDraft()` the instant a file is selected. That's the eager `POST /v1/models`.
- `composables/useUploadModel.ts:38-61` — `createModel()` is a hidden idempotent-ish helper keyed by a `modelId` ref. It's reused by both "save draft" and "publish," so the Model is created once and mutated afterward (`updateVisibility` on second call).
- `useUploadModel.ts:123-147` — `submit()` does `createModel → createVersion → addTag → uploadAdditionalFile`, serializing file uploads against an existing `modelId`.
- Net effect: from the user's perspective the model exists (and leaks) the moment they pick a file. From the code's perspective, "draft" and "publish" are the same mutation path with a different visibility flag.

## Target UX

1. User lands on `/models/upload`.
2. Drops a `.nlogox`. File begins uploading to staging **immediately** — but no `Model` exists. A `ModelDraft` is created on first interaction, not on file pick.
3. User fills in details across the stepper. Each field change debounced-PATCHes the draft.
4. Additional files / image upload to the draft's file endpoints as they're selected.
5. On the final step, user clicks **Publish**. Strict validation runs client-side; `POST /v1/model-drafts/:id/publish` materializes the `Model` + `ModelVersion`. Navigate to `/models/:id`.
6. At any point, user can close the tab. Revisiting `/models/upload` restores the draft. A new `/drafts` page lists all in-flight drafts.

Two key UX shifts from today:
- "Save as draft" is no longer a separate button — the draft is always saving in the background. The explicit action is **Publish**.
- The model URL is not available mid-flow. Today `modelUrl` resolves once `createModel()` runs; in the new flow there is no model URL until publish returns.

## Composable: `useModelDraft`

Replaces `useUploadModel`. Owns the draft id, debounced patches, file ops, publish.

```ts
// app/composables/useModelDraft.ts
export default function useModelDraft(initialDraftId?: string) {
  const api = useApi();
  const draftId = ref<string | null>(initialDraftId ?? null);
  const draft = ref<ModelDraftDto | null>(null);
  const saving = ref(false);
  const publishing = ref(false);
  const loadError = ref<string | null>(null);

  async function ensureDraft(opts?: { modelId?: string }): Promise<string> {
    if (draftId.value) return draftId.value;
    const { data, error } = await api.POST("/api/v1/model-drafts", {
      body: { modelId: opts?.modelId },
    });
    if (error || !data) throw new Error(describeError(error) ?? "Failed to start draft");
    draftId.value = data.id;
    return data.id;
  }

  async function load(id: string) { /* GET /v1/model-drafts/:id */ }

  const patch = debounce(async (fields: Partial<DraftFormFields>) => {
    const id = await ensureDraft();
    saving.value = true;
    try {
      await api.PATCH("/api/v1/model-drafts/{id}", {
        params: { path: { id } },
        body: fields,
      });
    } finally {
      saving.value = false;
    }
  }, 500);

  async function uploadPrimaryFile(file: File) { /* POST .../files role=primary */ }
  async function uploadAttachment(file: File) { /* POST .../files role=attachment */ }
  async function removeFile(fileId: string) { /* DELETE .../files/:fileId */ }

  async function publish(): Promise<{ id: string }> {
    const id = draftId.value;
    if (!id) throw new Error("No draft to publish");
    publishing.value = true;
    try {
      const { data, error } = await api.POST("/api/v1/model-drafts/{id}/publish", {
        params: { path: { id } },
      });
      if (error || !data) throw new Error(describeError(error) ?? "Publish failed");
      return { id: data.id };
    } finally {
      publishing.value = false;
    }
  }

  async function abandon() { /* DELETE /v1/model-drafts/:id */ }

  return {
    draftId, draft, saving, publishing, loadError,
    ensureDraft, load, patch, uploadPrimaryFile, uploadAttachment, removeFile, publish, abandon,
  };
}
```

Design notes:

- **`ensureDraft` is lazy.** Created on the first real mutation — first field edit or first file upload — not on page mount. Keeps `/models/upload` cheap to open.
- **`patch` is debounced** (500ms) and merges by field. The composable holds no authoritative form state; the Vue page does. The composable just syncs.
- **File ops are NOT debounced** — every file add/remove is an immediate round trip because S3 is the side effect, and the user expects a visible upload progress indicator.
- **Validation lives in the page**, not the composable. Drafts accept anything; only publish enforces the strict schema (mirrored from backend `strictPublishSchema`).
- **No `modelUrl` ref.** Caller gets an `id` from `publish()` and navigates itself.

## Page rewrite: `pages/models/upload.vue`

Route takes an optional `?draft=<id>` query. No param means "fresh upload" but will resume if a single in-flight draft exists for the user.

```ts
const route = useRoute();
const initialDraftId = (route.query.draft as string | undefined) ?? undefined;
const {
  draftId, draft, saving, publishing,
  ensureDraft, load, patch, uploadPrimaryFile, uploadAttachment, removeFile, publish,
} = useModelDraft(initialDraftId);

onMounted(async () => {
  if (initialDraftId) await load(initialDraftId);
});

// File select: no auto-create, but auto-upload once user picks a file
watch(() => formState.value.nlogoxFile, async (file) => {
  if (!file) return;
  if (formState.value.title === "") {
    formState.value.title = file.name.replace(/\.nlogox$/i, "");
    const infoTab = await readInfoTabFromNlogox(await file.text());
    if (infoTab && formState.value.description === "") {
      formState.value.description = infoTab.firstParagraphText;
    }
  }
  await ensureDraft();                    // first real mutation — create draft now
  await uploadPrimaryFile(file);          // stage the .nlogox
  patch({ title: formState.value.title, description: formState.value.description });
});

// Field edits: just patch. Debounced inside composable.
watch(() => formState.value.title, (v) => patch({ title: v }));
watch(() => formState.value.description, (v) => patch({ description: v }));
watch(() => formState.value.tags, (v) => patch({ tags: v }), { deep: true });
// etc.

async function onPublish(visibility: Visibility) {
  await patch.flush();                    // ensure last debounced edit landed
  await patch({ visibility });
  const result = await publish();
  toast.add({ title: "Model published", /* ... */ });
  await navigateTo(`/models/${result.id}`);
}
```

Removed: `submitDraft`, `createModel`, `createVersion`, `addTag`, `uploadAdditionalFile`, `modelUrl`.

Kept: the stepper, the form schema, the `.nlogox` info-tab scraping, the publish toast.

## File UI wiring

- `components/upload/NetlogoFileUpload.vue` — on file select, emits to the page, which calls `uploadPrimaryFile`. Show a per-file progress state driven by the upload promise.
- `components/upload/FileUploadCard.vue` / `FileUploader.vue` — each file gets a local state: `uploading | uploaded | failed`. On success, record the `fileId` returned by the backend so `removeFile(fileId)` can target it. No `modelId` passed anywhere.
- `components/upload/ImageUploader.vue` — same shape as additional files; image is just an attachment with a known `role` or naming convention.

The one gotcha: today `modelFiles` and `additionalFiles` are `ref<File[]>` arrays in the page. In the new flow they need to be `ref<StagedFile[]>` where `StagedFile = { fileId, filename, status, localFile? }`, because the server is now the source of truth for what's attached.

## New page: `/drafts` (My drafts)

- `pages/drafts/index.vue` — lists `GET /v1/model-drafts` for current user.
- Each card: title (or `"Untitled draft"`), updatedAt, primary filename if present, **Resume** (→ `/models/upload?draft=<id>`) and **Delete** buttons.
- Link into it from the user's profile menu or a subtle banner on `/models/upload` ("You have 2 drafts — resume?").

## Tag handling

Today `addTag` POSTs tags one by one after model creation. New flow: tags live in the draft JSON, posted as part of publish payload. The backend publish handler is responsible for creating tag rows. That removes the "tag failed silently" `.catch(() => null)` in current `submit()`.

## Abandonment

- Explicit: "Discard draft" button on the upload page calls `abandon()` → `DELETE /v1/model-drafts/:id` → navigate to `/models`.
- Implicit: user closes the tab mid-flow. Backend janitor reaps after 90 days. Frontend does nothing on `beforeunload`.

## Error + offline surface

- `saving` ref drives a small "Saving…" / "Saved" indicator near the stepper header. Mirrors Google Docs–style feedback so the user trusts that leaving the page is safe.
- Patch failures retry once; on second failure surface a non-blocking toast. Don't block the user from editing — they can keep typing, next patch will include the latest value.
- File upload failures are per-file and surfaced in that file's card with a Retry action.

## Migration plan

1. Ship backend `ModelDraft` endpoints.
2. Build `useModelDraft` composable + the `/drafts` page.
3. Rewrite `/models/upload` to use it. Delete `useUploadModel.ts` and its `submitDraft` caller.
4. Remove `submitDraft` references from any other component (grep `submitDraft`, `createModel`, `modelUrl` from the upload composable).
5. Once FE is off the old endpoints, backend can drop `ModelVersion.isDraft` and the legacy create-with-empty-file branch.

## Tradeoffs accepted

- **Debounced autosave means a crashed browser loses up to 500ms of typing.** Acceptable; the alternative is syncing per keystroke or on blur, both of which are either chatty or feel sluggish.
- **No optimistic local ids.** We wait for `ensureDraft` before any file op. In practice the first draft POST is fast, and gating file uploads on it is simpler than reconciling local → server ids later.
- **No offline mode.** If the network is out, the user sees "Save failed" toasts and their edits sit in memory. Building real offline support (IndexedDB queue) is a lot of code for a flow that starts with a network-heavy file upload anyway.
