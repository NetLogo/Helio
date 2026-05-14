# Async Preview Image UI Plan

Companion to backend `preview-image-async-plan.md`. The backend kicks off a pg-boss job to render a `.nlogox` preview via the existing NetLogo Services lambda when the primary file lands in draft staging. The UI watches for the result and slots it into the upload page's preview sidebar.

## Backend surface (relevant bits)

- Draft response now carries:
  - `previewImageStatus: 'pending' | 'ready' | 'failed'`
  - `previewImage: { s3Key, contentType, generatedAt }` (when ready)
  - `previewImageUrl: string` (signed S3 URL, minted by the backend mapper or route)
- When the primary file is uploaded to a draft, the backend enqueues a `generate-preview` job. The frontend doesn't trigger it.
- On publish: if `previewImage` is ready, backend embeds the bytes into the new `ModelVersion`. If pending or absent, publish proceeds without and a post-publish job fills in `ModelVersion.previewImage` asynchronously.

## Where this surfaces

The upload page's right rail already shows a `ModelCard`-style preview of the in-progress model. Today it falls back to `URL.createObjectURL(imageFile)` when the user attaches an image, or a placeholder.

After this change, the sidebar preview can also come from the lambda-rendered draft preview. Source priority:

1. **User-uploaded image** (already wired). Wins always — explicit user intent.
2. **Lambda-rendered preview** (new). Used when no user image is set and `previewImageStatus === 'ready'`.
3. **Placeholder** (existing). Used while pending or after failure.

## Composable additions

`useModelDraft` gains a `watchPreview` helper. The shape is designed to be swappable for socket push later without touching callers:

- Inputs: `{ intervalMs = 2500, timeoutMs = 60_000 }`.
- Callbacks: `{ onReady(url), onFailed() }`.
- Returns: `{ stop() }`.

Behavior:

- Kicks in after `uploadPrimaryFile` resolves with `previewImageStatus === 'pending'`.
- Refetches the draft each tick. Calls `onReady(previewImageUrl)` when status flips to `'ready'`. Calls `onFailed()` on `'failed'` or after `timeoutMs`.
- Cancellable via `stop()` (page calls on unmount or when the primary file is replaced/removed).

Polling is the MVP transport. If/when websockets land for drafts, the `watchPreview` shape doesn't change — only its internals.

## Page wiring

`pages/models/upload.vue`:

- A new local `previewImageUrl = ref<string | null>(null)`.
- After `await uploadPrimaryFile(file)` in the `nlogoxFile` watcher, call `watchPreview({ onReady: (url) => previewImageUrl.value = url, onFailed: () => { /* leave null */ } })`. Track the returned `stop()` so we can cancel.
- Cancel `watchPreview` and reset `previewImageUrl` when:
  - The primary file is replaced (new file picked or `Replace` clicked on a staged primary).
  - The primary file is removed (`removeFile(stagedPrimary.fileId)`).
  - The component unmounts.
- The sidebar `ModelCard`'s `image-url` prop is bound to a computed:
  ```
  computed: () =>
    userUploadedImageUrl.value   // user-supplied wins
      ?? previewImageUrl.value   // lambda-rendered
      ?? null;                   // placeholder via FallbackThumbnail
  ```

## UX details

- **Pending caption:** while `previewImageStatus === 'pending'` (and no user-uploaded image), the sidebar shows the placeholder with a small `Generating preview…` caption under it. Communicates the system is working without commanding attention.
- **Failed caption:** on `'failed'`, swap the caption to `Couldn't generate a preview. You can attach one manually.` and don't retry. Don't escalate to a blocking error — the user can publish regardless.
- **Mid-replace:** clearing `previewImageUrl` on a replace prevents a flash of the old preview while the new one is generating. The pending caption returns.
- **Timeout (60s default):** treat as a soft failure. Display the failed caption. Backend retries the job (2 retries, 30s backoff per backend plan) but the UI is allowed to give up on the visible polling sooner — total backend wait is ~90s before terminal failure, and we don't want a stuck poll spinning forever.

## Resume from `/drafts`

When resuming a draft, the existing draft fetch already includes `previewImageStatus` and `previewImageUrl`. The page should:

- If `previewImageStatus === 'ready'`, set `previewImageUrl` immediately. No poll.
- If `'pending'`, start `watchPreview` on mount.
- If `'failed'`, set the failed caption.
- If undefined (older draft created before this change), do nothing; let the user attach manually.

This logic naturally fits inside the resume hydration pass (see `resume-draft-ui-plan.md`).

## Publish-time behavior

The frontend doesn't gate publish on preview readiness. Per backend plan, publish proceeds in any status:

- **Ready:** backend embeds the bytes; the published `ModelVersion` has its preview from the start.
- **Pending / Failed / Absent:** backend publishes without and enqueues a post-publish job.

On the redirect-to-`/models/:id` page, the existing model card / detail view should pick up the preview when the post-publish job lands. The model detail page's `useAsyncData` keys + a focus listener (`refetch` on tab refocus) are enough for "lazy fill-in" without polling. If a tighter feedback loop is needed, the same `watchPreview`-style helper can be applied to the model card response.

**Recommendation:** no polling on the model page after publish. The user has navigated away from the upload flow; a missing preview for a few seconds on the just-published model is acceptable. Revisit if it's a real complaint.

## Type generation

Until `yarn generate:types` picks up the new draft response fields, the composable can keep its raw `fetch` fallback (already documented pattern in repo CLAUDE.md). Migrate to `useApi()` after types regenerate.

## Edge cases

- **Lambda cold start:** the first preview after a quiet period can take ~30s. The pending caption stays put; the 60s timeout gives us margin.
- **User uploads an image while preview is pending:** user image wins via the source-priority logic. `watchPreview` keeps running but its result is shadowed by the user image. When it resolves and the user later removes their image, the lambda preview pops in.
- **Primary file replaced rapidly:** debounce isn't necessary because the watcher's `stop()` is called on each replace. The next `watchPreview` invocation gets a fresh poll loop.
- **Network flakiness on poll:** treat individual tick failures as silent retries. Only the cumulative timeout triggers `onFailed`.

## Out of scope

- Real-time push (websockets / SSE). Polling for v1; the helper shape is socket-ready.
- Full historical backfill of preview-less existing models. Backend plan defers; UI never surfaces missing previews specially — the placeholder is fine.
- A "Regenerate preview" button on the upload page. Possible follow-up if the auto-flow misses often.

## Open questions

- **Poll interval default (2.5s):** balances feel-snappy vs. server load. Confirm with backend on lambda warm-time distribution; could relax to 5s if 2.5s is wasteful.
- **Timeout default (60s):** the lambda's cold start is the main consideration. 60s feels conservative-snappy; 90s would match the backend retry budget. Either works.
- **Surfacing a successful-publish-no-preview-yet state on the model page:** worth a tiny "Preview is generating…" badge? Or silent? Recommend silent.

## Reuse checklist

- `useModelDraft.ts` — already exists; extend with `watchPreview`.
- `pages/models/upload.vue` — existing right-rail sidebar layout.
- `components/ui/FallbackThumbnail.vue` — placeholder.
- `useToast()` — only on hard errors; not on the soft pending/failed states (those are inline captions).
