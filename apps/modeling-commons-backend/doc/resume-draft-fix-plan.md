# Fix: Resume Draft Editing From `/drafts`

Scope: make "Resume editing" on the drafts list actually land the user in a populated editor. Backend is already correct; all changes are in the frontend upload page.

## Root cause recap

`pages/models/upload.vue:205-217` calls `useModelDraft().load(id)` on mount. `load()` populates the composable's internal `draft` ref, but the page never reads it — `draft` isn't even destructured at `upload.vue:157-169`. Result: form + staged-file refs stay at defaults, and the template gate at `upload.vue:4` (`v-if="!formState.nlogoxFile"`) keeps the editor hidden.

## Changes

### 1. Destructure `draft` from `useModelDraft`

`upload.vue:157-169` — add `draft` to the destructured return.

### 2. Hydrate page refs from `draft.value` after `load()`

Replace the current `onMounted` with a hydration pass. Guarded by a `hydrating` ref so autosave watchers don't echo the just-loaded values back to the server.

```ts
const hydrating = ref(false);

onMounted(async () => {
  if (!initialDraftId) return;
  try {
    hydrating.value = true;
    await load(initialDraftId);
    const d = draft.value?.data;
    if (!d) return;

    const split = splitTagNames(d.tags ?? []);
    formState.value = {
      ...defaultFormValues,
      title: d.title ?? "",
      description: d.description ?? "",
      permission: d.visibility ?? "private",
      tags: split.tags,
      usecases: split.usecases,
    };

    if (d.primaryFile) {
      stagedPrimary.value = {
        fileId: d.primaryFile.id ?? "primary",
        filename: d.primaryFile.filename,
      };
    }
    stagedAttachments.value = (d.attachments ?? []).map((a) => ({
      fileId: a.id ?? a.s3Key,
      filename: a.filename,
    }));
  } catch {
    toast.add({
      title: "Draft not found",
      description: "We could not load that draft. Starting fresh.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    await nextTick();
    hydrating.value = false;
  }
});

function splitTagNames(flat: string[]): { tags: string[]; usecases: string[] } {
  const usecases: string[] = [];
  const tags: string[] = [];
  for (const t of flat) {
    if (t.startsWith("usecase:")) usecases.push(t.slice("usecase:".length));
    else tags.push(t);
  }
  return { tags, usecases };
}
```

Note: `subjects` can't be restored separately — `collectTagNames` merges `tags` and `subjects` into a flat array on the way out. Accepted loss for now; future work can store them as separate keys in `draft.data` if distinction matters.

### 3. Suppress autosave echoes during hydration

`upload.vue:256-277` — gate each watcher on `!hydrating.value`:

```ts
watch(() => formState.value.title, (v) => {
  if (hydrating.value) return;
  void patch({ title: v });
});
// same for description, and the tags/subjects/usecases watcher
```

The `nlogoxFile` watcher (`upload.vue:219-254`) doesn't need a guard as long as hydration never assigns `formState.nlogoxFile` — which it doesn't, since we have no `File` object for a staged primary.

### 4. Relax the editor template gate

`upload.vue:4` — a staged primary is a valid reason to show the editor even without a local `File`:

```vue
<div v-if="!formState.nlogoxFile && !stagedPrimary" class="...">
  <!-- empty-state upload modal -->
</div>
<div v-else class="...">
  <!-- stepper / form / publish -->
</div>
```

### 5. Right-rail primary file display

`upload.vue:97-104` — today shows a `NetlogoFileUpload` bound to `formState.nlogoxFile`. On resume that binding is null but a primary is staged; showing a new-upload prompt is misleading.

Render a staged-file block when `stagedPrimary` is set and `formState.nlogoxFile` is null:

```vue
<div v-if="stagedPrimary && !formState.nlogoxFile" class="flex items-center justify-between gap-2">
  <div class="truncate text-sm">{{ stagedPrimary.filename }}</div>
  <UButton variant="outline" size="xs" @click="onReplacePrimary">Replace</UButton>
</div>
<NetlogoFileUpload v-else v-model="formState.nlogoxFile" class="w-full" :ui="{ base: 'hidden' }" />
```

```ts
async function onReplacePrimary() {
  const prior = stagedPrimary.value;
  stagedPrimary.value = null;
  if (prior) await removeFile(prior.fileId).catch(() => null);
  // user now sees the upload slot; picking a file triggers the existing watch → uploadPrimaryFile
}
```

Before shipping: confirm backend `POST /v1/model-drafts/:id/files` with `role=primary` when a primary already exists either replaces or 409s. If it silently appends, the service needs a small fix there too — check `model-draft.service.ts#addFile`.

### 6. Attachments list rendering

`FileUploadCard` (`components/upload/FileUploadCard.vue`) takes `modelFiles` / `additionalFiles` as `File[]`. On resume those are empty but `stagedAttachments` has entries. Shortest fix: pass `stagedAttachments` in as a separate prop and render staged entries (filename + Remove button calling `removeFile(fileId)`) alongside the local `File[]` list.

Longer-term: collapse both into a single `StagedFile[]` model and convert local files to staged entries immediately after upload. Not required for this fix.

### 7. `formState.nlogoxFile = null` reset guard

`upload.vue:222-225` resets `formState` to defaults whenever `nlogoxFile` becomes null. On resume `nlogoxFile` starts null and never changes, so the watcher doesn't fire — no bug today. But after §5's "Replace" clears `stagedPrimary`, the user's typed title/description must survive. Behavior is already correct (we only reset on `nlogoxFile` going null → null is a no-op), but worth an inline comment so a future edit doesn't regress it.

## Out of scope

- Image preview on resume (`previewImageUrl` at `upload.vue:189-191`). Requires a backend presigned-URL endpoint. Filename-only is acceptable until then.
- Preserving `tags` vs `subjects` distinction through round-trip (requires schema change in `draft.data`).
- Replacing the two-list `FileUploadCard` API with a unified `StagedFile[]` model.

## Test path

1. Start a fresh upload, pick `.nlogox`, fill title/description/tags, add an attachment. Let autosave settle.
2. Navigate to `/drafts`. Confirm the draft appears with the correct title.
3. Click "Resume editing".
4. Expect editor to be visible (not the empty-state modal), title/description/tags populated, primary file shown in the right rail as staged, attachment listed in the Files step.
5. Edit the title. Expect "Saving…" then "Saved".
6. Click Replace on the primary. Pick a new `.nlogox`. Expect old primary removed server-side, new one uploaded.
7. Remove an attachment. Expect it gone server-side (verify via refresh).
8. Publish. Expect success and redirect to `/models/<id>`.
9. Back on `/drafts`, confirm the draft row is gone.
