# Nested-comments feature — bug report (historical)

Found by a dedicated bug-hunt pass on `app/components/comment/`. All 16 bugs below have since been
fixed — every entry carries a **FIXED** line describing what closed it. The former `it.fails` pins
now live on as regular regression tests in `bugs.test.ts`; BUG numbers below match the `// BUG-<n>`
comments in that file.

## 1. Load-more comments button can never appear — HIGH

- **Where:** `CommentsPanel.vue:80`
- **What happens:** `remainingComments` reads `props.count`, but no `count` prop exists — the data
  lives in `props.pagination.count`. `props.count` is always `undefined`, so `remainingComments`
  is always `0 - comments.length <= 0` and the "Load N more comments" button never renders
  (verified against the only production usage, `pages/theme.vue`, which passes
  `pagination: { count: 100 }` with 4 comments and shows no button). This is also a TS error
  hiding in the pre-existing check-types noise.
- **Expected:** button shows `pagination.count - comments.length` when positive.
- **Test:** `bugs.test.ts` — "shows a load-more button when pagination.count exceeds the shown comments"
- **Fix direction:** use `props.pagination.count` (and clamp at 0).
- **FIXED (2026-07-10):** `remainingCommentCount` in `comment-tree.ts` now takes `(comments, pagination)` and returns `max(0, pagination.count - comments.length)`; the panel passes `props.pagination`. The quirk-pinning test in `comment-tree.test.ts` was rewritten to the corrected semantics.

## 2. Delete-confirm dialog gets stuck open and permanently loading — HIGH

- **Where:** `CommentsPanel.vue:53-64`
- **What happens:** `handleDelete` sets `deleting = true` and never resets it, and never sets
  `deleteOpen = false`. After confirming a delete, the modal stays open with a spinning, disabled
  Delete button forever. If the user escapes via Cancel/ESC, `deleting` is still `true`, so every
  future delete dialog opens already-spinning and unusable.
- **Expected:** on confirm, close the dialog and reset `deleting` (in a `finally`).
- **Test:** `bugs.test.ts` — "closes the delete dialog and resets the loading state after confirm"
- **Fix direction:** `deleteOpen.value = false; deleting.value = false` (finally-block) in `handleDelete`.
- **FIXED (2026-07-10):** `handleDelete` closes the dialog and resets `deleting` in a `finally`, and also clears `deleteTarget` after a confirmed delete.

## 3. Panel's `readOnly` prop is silently ignored — MEDIUM

- **Where:** `CommentsPanel.vue:48` (vs. the `readOnly` declared via `CommentsPanelProps & CommentViewSettings`)
- **What happens:** the local `const readOnly = computed(() => !user.value.isLoggedIn)` shadows the
  declared `readOnly` prop in the template. A consumer passing `read-only` (e.g. archived/locked
  thread) still gets a composer and interactive comments for logged-in users.
- **Expected:** effective read-only = `props.readOnly || !isLoggedIn`.
- **Test:** `bugs.test.ts` — "respects an explicit readOnly prop even when the user is logged in"
- **Fix direction:** rename the computed and OR in the prop; also stop relying on prop shadowing.
- **FIXED (2026-07-10):** the local computed is renamed `isReadOnly` and computes `props.readOnly || !user.isLoggedIn`, so consumers can force a read-only panel for logged-in users.

## 4. Panel emits nothing — all interactions are silently discarded — MEDIUM

- **Where:** `CommentsPanel.vue:9-21` (and `defineEmits` absent)
- **What happens:** the panel listens only to `@delete`/`@write` from `CommentView` and declares no
  emits of its own. `reply`, `edit`, `like`, `unlike`, and `load` events from the comment tree die
  at the panel; the top-level `<CommentInput>` has no `@submit`/`@cancel` handlers at all, so a
  posted top-level comment is discarded while `CommentInput` clears the textarea (user-visible data
  loss). `handleDelete`/`loadMoreComments` are TODO stubs and `deleteTarget` is write-only.
- **Expected:** the panel (or a future container per task #4) forwards/handles every interaction.
- **Test:** report-only (pending backend/container design; would pin the wrong contract now).
- **Fix direction:** wire `@submit` on the composer and forward tree events (or handle them) when
  the data layer lands; make `handleDelete` use `deleteTarget`.
- **Addendum (boundary refactor):** the panel now re-emits `create`/`reply`/`edit`/`like`/`unlike`/
  `load`/`load-more` and emits `delete` (with `deleteTarget`) on confirm — but nothing consumes them
  yet, so there is still no backend call or optimistic UI and interactions have no persistent effect.
- **FIXED (2026-07-10):** closed by container consumption — `CommentsSection` consumes every panel
  emit (`create`/`reply`/`edit`/`like`/`unlike`/`delete`/`load`/`load-more`) with optimistic tree
  mutations, and the panel's `handleDelete` emits `delete` with the stored `deleteTarget`.
  `load`/`load-more` remain inert seams pending the backend.

## 5. `maximumShownRepliesPerLevel` is not propagated to nested levels — MEDIUM

- **Where:** `CommentView.vue:54-70`
- **What happens:** the recursive `<CommentView>` passes `maximum-nested`, `is-nested`, etc., but
  not `maximum-shown-replies-per-level`. Every level below the first reverts to the component
  default (5). With the panel's default of 2, one tree mixes both limits.
- **Expected:** the configured value applies at every depth.
- **Test:** `bugs.test.ts` — "propagates maximumShownRepliesPerLevel to nested reply levels"
- **Fix direction:** add `:maximum-shown-replies-per-level="maximumShownRepliesPerLevel"` to the
  recursive call (see also bug 16 on default drift).
- **FIXED (2026-07-10):** the recursive `<CommentView>` now binds `:maximum-shown-replies-per-level`, so the configured value applies at every depth.

## 6. Closing an input emits a spurious `write` event — LOW

- **Where:** `CommentView.vue:142-153` (also 155-163)
- **What happens:** `toggleReplyInput`/`toggleEditMode` emit `write` unconditionally, so cancelling
  a reply/edit — and the internal toggle call inside `submitCommentEdit`/`submitCommentReply` —
  fires a second `write` that is not a write attempt. Harmless today (the panel only toasts when
  logged out, and inputs never open while logged out), but any consumer counting/gating on `write`
  will misbehave, and each submit double-emits it.
- **Expected:** `write` fires only on actual write attempts (opening an input, like, delete).
- **Test:** `bugs.test.ts` — "does not emit write when the reply input is closed via cancel"
- **Fix direction:** emit `write` only when opening/acting, not when closing; don't route submit
  through the toggle helpers.
- **FIXED (2026-07-10):** the toggles emit `write` only on the open transition; cancel and submit go through dedicated `closeReplyInput`/`closeEditMode` helpers that emit nothing.

## 7. Open input becomes unclosable if `readOnly` flips while open — LOW

- **Where:** `CommentView.vue:142-153`
- **What happens:** the toggles `return` early when `props.readOnly` is true — before flipping the
  ref. If `readOnly` becomes true while a reply/edit input is open (e.g. session expiry refreshes
  auth state), Cancel and Submit can no longer close the input; every attempt just re-emits `write`
  (login toast) with the input stuck open.
- **Expected:** closing is always allowed; only opening is gated.
- **Test:** `bugs.test.ts` — "still allows closing an open reply input after readOnly becomes true"
- **Fix direction:** gate only the open transition (`if (readOnly && !isReplyInputVisible) return`),
  or split open/close functions.
- **FIXED (2026-07-10):** `readOnly` now gates only the open transition; the close path (toggle-while-open, cancel, submit) always works.

## 8. See-more at the nesting limit is a dead end — MEDIUM

- **Where:** `CommentView.vue:134-139` with the see-more block at 74-88
- **What happens:** when `maximumNested <= 0`, `hasVisibleReplies` is permanently false, yet
  `remainingReplies` is the full `replyPagination.count`, so "See N more replies" renders and
  clicking emits `load`. Even if a future handler loads the replies, they can never be displayed at
  that depth — the button can never do anything visible. Related smell at visible depths:
  `remainingReplies = count - shownReplies.length` counts locally-loaded-but-hidden replies
  (hidden by `maximumShownRepliesPerLevel`) as needing a `load` fetch; a naive page-append handler
  would duplicate them. (The lead's other claim — `maximumNested - 1` decrementing below 0 — was
  cleared: children are not rendered at `maximumNested <= 0`, so negative values never occur.)
- **Expected:** at the limit, see-more should navigate to a thread view or expand in place
  (pending task #5); the `load` emit should mean "fetch what isn't loaded", not "reveal".
- **Test:** report-only (correct behavior is a pending design decision).
- **Fix direction:** distinct affordance at the nesting limit; separate "reveal hidden loaded
  replies" from "load more from server".
- **Addendum (continue-thread):** the dead end is superseded — at the limit `CommentView` now
  renders a "Continue this thread (N replies)" link to `/comments/<id>` instead of
  `CommentSeeMore`, so the `load`-emit-at-limit no longer occurs. Remaining: the `/comments/[id]`
  thread page is a stub pending implementation, and the visible-depth smell above (counting
  locally-loaded-but-hidden replies as needing a `load` fetch) still stands.
- **FIXED (2026-07-10):** residual reveal-vs-load — `CommentView` keeps a per-node `revealedCount` ref (seeded from `maximumShownRepliesPerLevel`); see-more first reveals all locally loaded replies, then shows only the clamped server remainder (`hiddenLoadedReplyCount`/`serverRemainingReplyCount` in `comment-tree.ts`) and only then emits `load`; the nesting-limit branch still reports the full count for the continue-thread link.

## 9. `CommentSeeMore`'s declared emit is dead API; wiring relies on attr fallthrough — LOW

- **Where:** `CommentSeeMore.vue:21-23` vs `CommentView.vue:84-87`
- **What happens:** `CommentSeeMore` declares and emits `see-more-replies`, but `CommentView`
  listens for `@click`. Because `click` is not a declared emit, the listener falls through as an
  attribute to the root `UButton`, so clicking happens to work (proved by the passing companion
  test) — but the component's declared API does nothing, and the wiring breaks the moment someone
  adds `click` to `defineEmits` or a wrapper element.
- **Expected:** parent consumes the declared event.
- **Test:** `bugs.test.ts` — "emits load when CommentSeeMore fires its declared see-more-replies event"
  (+ passing companion "see-more button click reaches the parent only via attribute fallthrough").
  Note: the pinned expectation is `@see-more-replies` → `load`; if the fix instead deletes the
  custom emit and standardizes on `click`, retire this test alongside.
- **Fix direction:** `@see-more-replies="emit('load', ...)"` in CommentView (or drop the custom emit).
- **FIXED (2026-07-10):** `CommentView` now listens to the declared `@see-more-replies` event (routed through the bug-8 reveal-then-load handler); the attribute-fallthrough companion test was retired with the `@click` wiring it proved.

## 10. Dismissing the delete dialog via ESC/overlay skips `cancel` — LOW

- **Where:** `ConfirmDeleteCommentDialog.vue:36-42`
- **What happens:** only the Cancel button emits `cancel`; when `UModal` closes itself (ESC,
  overlay click), the `open` model just flips to false. The panel's `@cancel="cleanupDeleteEvent"`
  never runs, so `deleteTarget` stays stale. Low impact today (it is overwritten on the next
  `confirmDelete` and currently unread — see bug 4), but the cleanup contract is broken.
- **Expected:** any dismissal path other than confirm behaves as cancel.
- **Test:** `bugs.test.ts` — "emits cancel when the modal is dismissed via ESC/overlay"
- **Fix direction:** watch the model for `true → false` transitions (or `@update:open`) and emit
  `cancel` when not confirming.
- **FIXED (2026-07-10):** the dialog watches its `open` model and emits `cancel` on any `true → false` transition that is not confirm-driven; a `confirming` flag set by the Delete button suppresses a spurious cancel on confirm-close, and the Cancel button now just closes and lets the watcher emit.

## 11. Enter always submits — a newline is impossible to type — MEDIUM

- **Where:** `CommentInput.vue:28`
- **What happens:** `@keydown.enter.prevent="handleSubmit"` fires for every Enter, including
  Shift+Enter (no `.exact`/modifier check), so multi-line comments cannot be typed at all despite
  the control being a textarea with autoresize.
- **Expected:** Enter submits, Shift+Enter inserts a newline (or the reverse — but one path must
  produce a newline).
- **Test:** `bugs.test.ts` — "inserts a newline instead of submitting on Shift+Enter"
- **Fix direction:** guard the handler: `if (event.shiftKey) return` before `preventDefault`, e.g.
  a method receiving the event or `@keydown.enter.exact.prevent`.
- **FIXED (2026-07-10):** `@keydown.enter.exact.prevent` — plain Enter submits; Shift+Enter (or any modified Enter) skips the handler and its `preventDefault`, so the textarea inserts a newline and `autoresize` grows it.

## 12. Input clears optimistically on submit — text lost if the parent rejects — LOW

- **Where:** `CommentInput.vue:108-112`
- **What happens:** `handleSubmit` emits and immediately sets `comment.value = ""`. Once a backend
  exists, any failed/rejected submission loses the user's text with no recovery.
- **Expected:** clear only after the parent accepts (async callback/prop) or restore on failure.
- **Test:** report-only (correct contract depends on the future async submit API).
- **Fix direction:** let the parent own clearing (e.g. `submit` handler returns a promise, or a
  `clear()` expose).
- **FIXED (2026-07-10):** `CommentInput` no longer clears itself on submit; it `defineExpose`s `clear()` and parents own clearing. The panel's top-level composer calls `clear()` via a template ref after emitting `create` — acceptance is synchronous-optimistic today; restore-on-failure lands with the backend at the `CommentsSection` `runOptimistic` seam. `CommentView`'s reply/edit inputs unmount on close (`v-if`) and re-seed from `initialText` on reopen, so they need no `clear()` call.

## 13. "Edit your reply to X" placeholder branch is unreachable — LOW

- **Where:** `CommentInput.vue:96-99` vs the edit usage in `CommentView.vue:19-26`
- **What happens:** the placeholder branch for `isEditing && target` exists, but `CommentView`
  never passes `:target` together with `is-editing`, and no other call site does. Dead branch in
  production; only the isolated component test exercises it.
- **Expected:** either pass `:target="author.name"`-equivalent when editing a reply, or drop the branch.
- **Test:** report-only (which side is wrong is a product decision).
- **Fix direction:** pass the replied-to author when editing nested replies, or delete the branch.
- **FIXED (2026-07-10):** the recursive `CommentView` passes `:parent-author-name="comment.author.name"` down (new optional `parentAuthorName` prop) and the edit input receives `:target="parentAuthorName"`, so editing a nested reply shows "Edit your reply to X" while top-level edits keep the plain placeholder. The reply input's `:target` (own author) is unchanged.

## 14. `CommentActions.replyCount` is a dead prop — LOW

- **Where:** `CommentActions.vue:40` (fed from `CommentView.vue:33`)
- **What happens:** `CommentView` passes `:reply-count="replyPagination.count"` and the prop is
  declared, but the template/computed never use it — the Reply button shows no count.
- **Expected:** show the count next to Reply, or remove the prop.
- **Test:** report-only (dead API, no behavior to pin).
- **Fix direction:** render it (`Reply · {{ replyCount }}`) or delete prop + binding.
- **FIXED (2026-07-10):** the Reply button now renders `Reply · N` when the count is positive (plain `Reply` at zero), mirroring how the Like button renders `likes`.

## 15. URLs with balanced parentheses get their closing paren stripped — LOW

- **Where:** `CommentTextRepresentation.vue:8-11` (`splitTrailingPunct`)
- **What happens:** the trailing-punctuation stripper unconditionally removes `)` (and friends)
  from the end of a URL, so `https://en.wikipedia.org/wiki/Rust_(programming_language)` links to
  `.../Rust_(programming_language` — a broken page. Stripping is only correct when the paren is
  unbalanced (the `(see https://example.com).` case the baseline test covers).
- **Expected:** keep trailing `)`/`]` when balanced by an opener inside the URL.
- **Test:** `bugs.test.ts` — "keeps the closing paren of a URL with balanced parentheses"
- **Fix direction:** standard linkifier heuristic — count openers/closers in the URL and re-attach
  closers up to balance.
- **FIXED (2026-07-10):** `splitTrailingPunct` re-attaches trailing `)`/`]`/`}` closers while the URL contains more matching openers than closers; unbalanced closers are still stripped, keeping the baseline `(see https://example.com).` behavior.

## 16. Default settings drift: panel (3 / 2) vs view (4 / 5) — LOW

- **Where:** `CommentsPanel.vue:38-43` vs `CommentView.vue:96-110`
- **What happens:** `maximumNested`/`maximumShownRepliesPerLevel` default to 3/2 on the panel but
  4/5 on the view. A standalone `CommentView` behaves differently from a panel-hosted one, and
  combined with bug 5 a single panel-hosted tree currently mixes 2 (top level) with 5 (below).
- **Expected:** one source of truth for defaults.
- **Test:** report-only (fold into the bug-5 fix).
- **Fix direction:** export shared default constants from `types.ts` and use them in both components.
- **FIXED (2026-07-10):** `COMMENT_TREE_DEFAULTS` (3 / 2 — the panel's values) exported from `types.ts` and used by both `CommentsPanel` and `CommentView` `withDefaults`.

---

## Leads investigated and CLEARED (not bugs)

- **`maximumNested - 1` going below 0** — children are only rendered when `maximumNested > 0`, so
  a value below 0 is never instantiated; no functional effect.
- **Recursive `v-bind="reply"` prop leakage** — `Comment` keys don't overlap `CommentViewSettings`
  keys, and the explicit bindings after `v-bind` take precedence; no clash between a reply's own
  `replyPagination`/`permissions` and panel-level settings.
- **`remainingReplies` double-count at visible depths** — `count - shownReplies.length` is
  arithmetically consistent with fixtures where `replyPagination.count` equals total replies
  (the label "See N more replies" matches what is hidden); the residual `load`-semantics concern
  is captured under bug 8.
- **Edit mode showing stale content after a prop update** — the edit `CommentInput` is `v-if`-
  mounted per editing session, so it re-reads `content` each time it opens; while open, ignoring
  external content changes is acceptable editing behavior.
- **`formatRelativeDate` edge cases** — future dates (all diffs negative) fall through every
  `> 0` check and return "just now", which degrades gracefully; boundaries are already covered by
  `app/utils/formatters.test.ts`.
- **Double-`write` on the panel toast path for logged-out users** — inputs never open while
  read-only, so the submit/cancel double-emit (bug 6) cannot cause double toasts today.
