# Version History UI Plan

Companion to backend `legacy-migration-version-history-plan.md`. Adds **revert** and **compare** flows to the existing `ModelVersionsTab.vue` (which already has a disabled compare button).

## Backend surface

- `POST /v1/models/:id/versions/:version/revert` — write permission. Body `{ description? }`. Returns `{ modelId, versionNumber }` (new version).
- `GET /v1/models/:id/versions/compare?from=N&to=M` — read permission. Returns `{ from, to, sections: { info, code, interface } }` where each section is unified-diff text.

Errors of note:
- `CannotRevertToCurrentError` → 409 ("Already the current version").
- `CannotRevertToDraftError` → 409 (the source must be finalized).
- `CompareSameVersionError` → 409 (from === to).

## Existing surface

`ModelVersionsTab.vue` already renders a version list with a compare-button stub. This plan wires that up and adds the revert action.

## Library

`diff2html` (npm: `diff2html`) — takes unified-diff text and renders side-by-side or unified HTML. Pair with `highlight.js` for the `code` section to get NetLogo syntax fallback (`hljs.register('netlogo', ...)` from existing language definitions if available, else `clojure`/`lisp` as a near match).

Wrapped in `components/model-detail/version-history/DiffViewer.vue` so the diff library is contained — easy to swap later.

## Component tree

Under `components/model-detail/version-history/`:

- `ModelVersionsTab.vue` — already exists. Wire up:
  - Each row gains a kebab menu with `Compare with current`, `Compare with previous`, `Compare with…` (picks via a `USelectMenu`), `Revert to this version` (only when caller has write).
  - The existing two-pick `Compare` button stays as a primary affordance.
- `CompareVersionsDialog.vue` — `UModal` that opens with `(from, to)` from the parent. Contains:
  - Header with version pickers (`From: v3` / `To: v5`) — swappable.
  - Tabs: `Info` | `Code` | `Interface`. Each tab body renders a `DiffViewer`.
  - View-mode toggle: `Side-by-side` (default desktop) / `Unified` (default mobile and small viewports).
  - "Open in fullscreen" action that navigates to `/models/:id/versions/compare?from=N&to=M`. Useful for deep code diffs.
- `CompareVersionsPage.vue` — full-page route at `/models/:slug/:id/versions/compare`. Reads `from`/`to` from query, otherwise identical to the dialog body. Adds a `Copy patch` button per section (clipboard write of the raw unified-diff text).
- `DiffViewer.vue` — wraps `diff2html`. Props: `{ unifiedDiff: string, mode: 'side-by-side' | 'line-by-line', language?: string }`. Renders empty-state ("No changes in this section") when the patch body is empty.
- `RevertVersionDialog.vue` — `UModal` confirm. Source version, optional `description` override (default placeholder reads `Reverted to v{n}`), `Revert` primary button. On success, navigates to the model's latest version (the just-created one) and toasts "Reverted to v{n}. New version is v{m}.".

## Composable

`useModelVersionCompare(modelId, from, to)`:

- `useAsyncData` keyed `compare-${modelId}-${from}-${to}`.
- Surfaces `sections`, `from`, `to`, `loading`, `error`.
- Watches `from` / `to` refs so swapping picker values refetches.

`useModelVersionRevert(modelId)`:

- Single async `revert(versionNumber, description?)`. Not optimistic — the side effect on the version list is big enough that we'd rather refetch. Returns the new version number.
- Caller refetches the versions list afterward (already exposed via `useModelVersions`).

## Routing

Add `pages/models/[id]/versions/compare.vue` (or, given the existing custom slug routes in `nuxt.config.ts`, add a corresponding `:slug/:id/versions/compare` mapping in `hooks.pages:extend`). The page reads `from` and `to` from query, validates `from !== to`, renders the same body as the dialog with extra room to breathe.

The model detail page's `/versions/:versionNumber` route already exists; nothing changes there.

## UX details

- **Default pair on `Compare`:** if the user has selected exactly two checkboxes in the version list, use those. Otherwise default to `(latest - 1, latest)`.
- **Picker swap:** a small ⇄ button between the two pickers flips `from`/`to`. The diff direction matters (additions vs. removals).
- **Identical sections:** `diff.createPatch` returns essentially an empty body (just headers) when nothing changed. `DiffViewer` renders an "no changes in this section" state.
- **Interface diffs:** `interface` is a JSON-serialized widget tree, sorted-key. It looks like JSON. Render with `language: 'json'` for syntax highlighting; the user will read it but doesn't need to write it.
- **Revert button placement:** only on rows that are not the current latest. The kebab menu on the current latest row hides the option entirely (matches `CannotRevertToCurrentError`).
- **Revert from draft:** drafts shouldn't show in the version list at all (the upload-redesign work removes drafts from `Model`/`ModelVersion`), so `CannotRevertToDraftError` should never reach a normal user. If it does, surface the toast and move on.

## Edge cases

- **`from === to`:** picker UI disables the `Compare` button when they match. Backend defends with a 409; UI shouldn't ever send the request.
- **Cross-model version number:** can't happen from picker UIs (picker is scoped to one model's versions). If it does, surface the 404 toast.
- **Permission downgrade during revert:** caller starts with write, loses it mid-flow. Backend 403s; UI shows the toast and refetches.
- **Long code diffs:** patches over a few-thousand-line file are fine for `diff2html`. If we ever observe sluggish renders, virtualize the diff list (`diff2html-vue` doesn't, but a lazy chunk render via `IntersectionObserver` is straightforward).

## Out of scope

- Inline editing inside a diff. Diffs are read-only; edits happen via the upload redesign's draft-of-a-new-version flow.
- Cross-model compare (`compare?fromModelId=A&toModelId=B`). Backend flagged as deferred.
- Word-level / character-level diffs. `diff2html` line-mode is fine for v1.
- Tunable context size. Backend default (4 lines) is fine.

## Open questions

- **Default view mode on desktop:** side-by-side reads better for code; unified reads better for narrow prose. Picking side-by-side by default; revisit after we see usage.
- **Revert from a specific UI surface only?** Right now it's in the version row kebab. We could also offer it from the diff viewer's header ("← Revert to this version"). Defer unless usage shows the kebab is undiscoverable.
- **Audit annotations:** the backend emits `model_version.reverted`. We could surface a `(reverted from v3)` badge on a version row. Easy to add post-MVP once we expose version-level events.

## Reuse checklist

- `components/model/detail/ModelVersionsTab.vue` — existing scaffold.
- `useAsyncData` keys per request.
- `useToast()` for revert success / error.
- `utils/errors.ts` `handleApiError` for the conflict-state messages.
- `components/shared/Loader.vue` during diff fetch.
