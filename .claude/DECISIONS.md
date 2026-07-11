# Decisions

Critical, non-obvious decisions made while working in this repo. Newest first.

## 2026-07-10 — Comment threads nested under models: `/models/:id/comments/:commentId`

**Context:** The standalone `/comments/:id` thread page had no model context. Comments belong to a model on the future backend, so the thread route moved under models.

**Decisions:**
1. **Route contract:** `/models/:id/comments/:commentId` (`app/pages/models/[id]/comments/[commentId].vue`) plus the slug alias `model-slug-comment-thread` → `/models/:slug/:id/comments/:commentId` pushed in `nuxt.config.ts` `pages:extend`, matching the other slug aliases. This **supersedes** the `/comments/:id` contract recorded below — `app/pages/comments/[id].vue` is deleted. The page's back affordance links to `/models/:id` (works for both route shapes since `route.params.id` is the model id in each).
2. **Link construction depends on `Comment.modelId`** (new optional field, matching the future backend shape): CommentView's at-limit "Continue this thread" link is `/models/${comment.modelId}/comments/${comment.id}`. When `modelId` is missing the affordance hides entirely (no link, no see-more — same rendering as having no replies). Fixtures are stamped recursively with `DEMO_MODEL_ID = "model-demo"` via a `stampModelId` helper in `fixtures.ts`.

**Context:** The comments feature has no backend yet. A dedicated bug-hunt pass found 16 defects (`app/components/comment/BUGS.md`).

**Decisions:**
1. **Known bugs are pinned, not patched.** Each testable bug has an `it.fails` test in `app/components/comment/bugs.test.ts` asserting the CORRECT behavior — the suite stays green while the bug exists, and fixing a bug flips its pin loudly, forcing the fixer to promote it to a regular test. Refactoring done alongside was bug-for-bug behavior-preserving; `comment-tree.ts` deliberately reproduces two quirks (BUG-1, BUG-8 residue) with pointer comments.
2. **`/comments/[id]` (`app/pages/comments/[id].vue`) is a thin stub** over `CommentsSection :comment-id` — it is the target of the "Continue this thread" link CommentView renders at the nesting limit. Route shape `/comments/<commentId>` is now a contract between CommentView and this page; change both together.

## 2026-07-10 — Comment continue-thread link + collapsing: component-level branching, dumb metadata bar

**Context:** Two additions to the recursive `CommentView`: a "Continue this thread" affordance at the nesting limit (supersedes the BUG-8 dead-end see-more) and Reddit-style per-comment collapsing. HARD constraints: `comment-tree.ts` untouched (its at-limit full-count quirk is pinned by tests), all 10 `it.fails` pins in `bugs.test.ts` keep failing (notably BUG-9's `@click`-fallthrough see-more wiring stays verbatim where `CommentSeeMore` still renders).

**Decisions:**
1. **At-limit branching lives in `CommentView`, not `comment-tree.ts`:** `atNestingLimit = maximumNested <= 0` picks between a link-styled `UButton :to="/comments/<id>"` ("Continue this thread (N replies)", N = `remainingReplyCount`, i.e. the full `replyPagination.count` at the limit) and the unchanged `CommentSeeMore` + `@click` → `load`. `load` is never emitted at the limit anymore. `/comments/[id]` is a future thread page — link-only for now. Both affordances share the existing spine-eraser/elbow wrapper so tree drawing is unchanged.
2. **Collapse state is a local `ref(false)` per `CommentView`** (no persistence, no provide/inject); `CommentMetadataBar` stays dumb with additive optional props `collapsible`/`collapsed`/`hiddenReplyCount` + a `toggle-collapse` emit, rendering the chevron toggle (`aria-expanded`, dynamic aria-label) and the muted collapsed summary ("· N replies hidden" / "· collapsed"). Collapsing is a read action: it never emits `write` and ignores `readOnly`.
3. **Collapsed = leaf:** everything below the metadata bar (body/actions/reply-input/replies/see-more) sits in one `<template v-if="!isCollapsed">`, and the node's own `CommentSpine` is additionally gated on `!isCollapsed`; the parent-context eraser/elbow (`isNested`/`isLastSibling`) stay untouched since they belong to the parent's tree drawing. Known trade-off: collapse unmounts an open reply/edit input, so its draft text is lost on expand (open-state ref survives).

**Context:** `app/components/comment/` refactored along data/logic/UI boundaries ahead of the container/data layer (task #4). HARD constraint: behavior-preserving, bug-for-bug — every `it.fails` pin in `bugs.test.ts` must keep failing.

**Decisions:**
1. **`CommentView` takes a single `comment: Comment` prop** plus individual settings props (`CommentViewProps = { comment } & CommentViewSettings` in `types.ts`); recursive call sites use `:comment="reply"` instead of `v-bind`. Settings stay prop-threaded (NOT provide/inject) and BUG-5 (no `maximum-shown-replies-per-level` on recursion) and BUG-16 (panel 3/2 vs view 4/5 default drift) are deliberately preserved.
2. **Reply-visibility math lives in the pure module `comment-tree.ts`** (`visibleReplies`, `remainingReplyCount`, `hasVisibleReplies`, `hasSpine`, `remainingCommentCount`), copied verbatim quirks included; `remainingCommentCount` keeps BUG-1 by reading an optional top-level `count` the panel never passes (this also removed the `props.count` TS error from the baseline noise — 7 → 6 errors).
3. **`CommentsPanel` is now an event seam:** emits `create` (`{content}` from the top-level composer), `reply`/`edit` (`{commentId, content}`), `like`/`unlike`/`load`/`delete` (`{commentId}`), and `load-more` (`CommentPagination`). `delete` fires only after dialog confirm with the stored target id; `write` stays panel-internal (login toast). Nothing consumes these yet — the future container does.

## 2026-06-22 — Oversized upload now returns 413 (was 500); two tag-route bugs found

**Context:** Building a backend test-coverage matrix for draft upload/publish. Probing the live backend surfaced two genuine bugs.

**Bug 1 (FIXED in `src/server/plugins/error-handler.ts`):** An upload exceeding the 15 MB cap (`rules.limits.fileUpload.size.max`) made `@fastify/multipart`'s `toBuffer()` throw `FST_REQ_FILE_TOO_LARGE` (a `FastifyError` carrying `statusCode: 413`). That code was **not** in `fastifyErrorCodesMap`, so the catch-all returned **500 Internal Server Error** for a plain client mistake. Added a `FST_REQ_FILE_TOO_LARGE → 413 Payload Too Large` mapping. E2E "Uploading an oversized primary file is rejected" now asserts 413.

**Bug 2 (NOT fixed — flagged):** `GET /api/v1/models/:id/versions/:version/tags` builds its response objects as `{ id, name, createdAt }`, omitting `displayName`, which `tagResponseDtoSchema` marks **required**. When a version actually has a linked tag, fast-json-stringify throws `"displayName" is required!` and the route **500s**. The existing "List tags for a specific version" e2e scenario only ever exercises the empty-array path (its tag lands on a different version), so the suite stays green and the bug is masked. New tag round-trip coverage therefore reads tags back through `GET /v1/models/:id/card` (`tagsOnLatestVersion`, mapped via `tagMapper.toResponse` which sets `displayName`) instead of the buggy version-tags route.

**Not enforced (so left `@pending`):** "Per user per model there is at most one draft" — `modelDraftService.create()` does no per-model uniqueness check; a second create targeting the same model returns 201 and leaves two drafts. "Per user per model drafts are purged on publish" was **un-pended** because the scenario only seeds one draft and publish hard-deletes the published draft, so zero remain (deterministic). Multi-draft purge is *not* enforced — publishing one of two drafts for a model leaves the other.

**Skipped:** "Preview auto-generated on publish" — auto-generation calls the external rendering service, which returns 502 in the test env, so `previewImageUrl` is `null` after publish; not deterministic, so no scenario added. Rate-limit testing skipped as non-deterministic.

## 2026-06-22 — Metadata-only draft publish patches the current version; file changes bump it

**Context:** `model-draft.service.ts` `publish()` always created a new version. Renaming a model or flipping visibility should not spawn a version. Product rule: the **primary file** and **model files** are version-relevant; **tags, visibility, title, description, preview image, and additional files** are not.

**Decisions:**
1. **Dropped the dead `ModelVersionFile` table** (zero references in `src`/`tests`; only the generated client mentioned it). Migration `20260622000000_model_file_kind_drop_version_file`.
2. **Unified file storage on `ModelAdditionalFile` + a `kind` discriminator** (`enum ModelFileKind { model | additional }`, default `additional`). The frontend uploads model files with role `model-file` (→ `kind:'model'`) and additional files with role `attachment` (→ `kind:'additional'`). `GET /v1/models/:id/additional-files` is unchanged but now returns `kind`.
3. **Detection is replacement-based, not content-based.** At seed time `seedDraftDataFromModel` persists a `seededFrom` baseline (`{versionNumber, primaryFileS3Key, modelFileS3Keys[], additionalFileS3Keys[], previewImageS3Key?}`) of staged S3 keys. At publish: `createNewVersion = !existingModel || !seededFrom || primaryKeyChanged || modelFileSetChanged`. Re-uploading byte-identical content still counts as a change (new staged key). Missing `seededFrom` falls back to a new version (safe).
4. **`createNewVersion=false` → patch the current (latest, non-finalized) version in place** (update title/description/preview-if-changed/visibility, reconcile tags, add-only new additional files, purge draft) and return **HTTP 200** with the same `versionNumber`. `createNewVersion=true` → existing new-version flow, **HTTP 201**. The publish response carries `createdNewVersion`.
5. **`kind` + `seededFrom` were added to the Typebox v1 draft schema** (both `draftDataV1Schema` and `strictDraftDataV1Schema`). The compiled `Parse`'s `Clean` step strips unknown props, so omitting them would silently drop the data — a `schemas.spec.ts` round-trip test guards this.
6. **Kept the publish restructure inside `model-draft.service.ts`** (two closure-scoped helpers `publishNewVersion`/`publishMetadataPatch`) rather than extracting a `patches/publish-draft.patch.ts` as the guide suggested — there is no existing patch pattern in the codebase and the helpers need ~20 injected deps, so a closure is the least-surprising fit here.

## 2026-06-22 — E2E authed specs run in server mode pinned to localhost:3005

**Context:** The verified-user e2e specs (upload, drafts, likes, verify-handshake, password-reset) need an authenticated session. Running them locally without a separately-started frontend (`@nuxt/test-utils` "server mode", which builds + serves the app itself) hit two blockers.

**Decisions (in `tests/e2e/setup.ts` + `tests/e2e/helpers/nav.ts`):**
1. **Pin the server-mode port to 3005** (`E2E_SERVER_PORT ?? 3005`). Better Auth's verification `callbackURL` and the backend's `ALLOWED_ORIGINS` are fixed to `:3005`; an unpinned random port makes the post-verification redirect land on a dead port.
2. **Navigate the app via `localhost`, never `127.0.0.1`.** `@nuxt/test-utils` binds the server to `127.0.0.1`, but the Better Auth session cookie is host-scoped + `SameSite=Lax` and set by the backend at `localhost:3000`. `127.0.0.1` is a *different site* from `localhost`, so navigating via `127.0.0.1` silently drops the session (SSR auth middleware then bounces to `/login`). `setup.ts` exports `appUrl()` resolving against `http://localhost:3005`; `gotoHydrated` and all authed specs use it instead of `url()`.

**Why not host mode (`E2E_HOST`):** CI still uses host mode against a built `:3005` server (everything `localhost`, so it's unaffected). The above makes the same specs runnable locally via plain `yarn test:e2e` without a manually-started frontend.

**Gotcha:** the navbar renders a desktop + mobile user-menu trigger (one hidden); target `[aria-haspopup='menu']:visible`. Onboarding must be completed via a *fresh* hydrated load (the reactive session lags after the verification redirect — see findings below).

## 2026-06-22 — E2E verified-user via Mailpit, not a backend test endpoint

**Context:** Five frontend E2E specs (`tests/e2e/{model-upload,model-draft-resume,model-detail-tabs,auth-signup-login,auth-password-reset}.test.ts`) were gated behind `it.todo` because they need a *verified, signed-in user*. Better Auth has `requireEmailVerification: true`, so a freshly signed-up user can't log in until the email-verification token is consumed. The test comments called for "backend test-token retrieval."

**Decision:** Obtain the verified user by reading the verification email from **Mailpit's HTTP API** (`MAILPIT_URL`, default `http://localhost:8025`) rather than adding a NODE_ENV-gated backend endpoint or querying Postgres directly. A `signUpAndVerify(page)` helper (`tests/e2e/helpers/auth.ts` + `tests/e2e/helpers/mailpit.ts`) signs up, polls Mailpit for the verification link, navigates to it (Better Auth `autoSignInAfterVerification: true` signs the user in), then clears the onboarding redirect via the UI.

**Why:** Mailpit is already in `apps/modeling-commons-backend/docker-compose.dev.yml` and CI, already receives the real verification mail, and its API port `8025` is already published. So this needs **zero backend changes and zero CI/infra changes**, adds no production-gated attack surface, and exercises the real verification flow end-to-end. Rejected: a backend test endpoint (new surface to gate/maintain) and direct DB reads (couples frontend E2E to schema/connection).

**Notes / gotchas:** mail is sent fire-and-forget so Mailpit must be *polled*; the session cookie is host-only on `localhost` so it spans `:3000` and `:3005`; the password-reset link carries the token in the path (`/api/auth/reset-password/<token>`) and 302s to the frontend `/reset-password?token=…` form.

## 2026-07-10 — Comments data layer: fixture-backed useComments + immutable tree mutations

**Context:** `CommentsPanel` became purely presentational, but there is no comments backend. A container (`CommentsSection.vue`) and read composable (`useComments`) were added on top, with placeholder data.

**Decisions:**
1. **`useComments` (app/composables/comments/useComments.ts) returns a reshaped object** (`{ comments, pagination, status, error, refresh }`) instead of the raw `useAsyncData` result, so the container never touches `data.value?.…` and the placeholder→real swap is confined to one fetcher body. Keys are `comments:model:<id>` / `comments:thread:<id>`, watched via a computed key so source changes refetch. The PLACEHOLDER fetcher returns `structuredClone`s of `app/components/comment/fixtures.ts` (modelId → `comments` array; commentId → tree-search across fixtures wrapped as a single root; unknown/empty id → empty payload). Real endpoints to fill: `GET /api/v1/models/{id}/comments`, `GET /api/v1/comments/{id}/thread`.
2. **Tree mutations in `comment-tree.ts` are immutable-return with identity preservation**: `findCommentById`, `updateCommentById`, `insertReply`, `removeCommentById` return a NEW array when a node changed and the SAME reference when nothing matched, cloning only the changed node and its ancestors. This lets the container reassign `local.comments` for optimistic updates without ever mutating the `useAsyncData` cache, makes rollback = keeping the previous reference, and keeps untouched subtrees `===` for cheap re-renders.
3. **Optimistic replies are PREPENDED** to `replies` (and creations prepended to the top-level list) so they are visible under the panel's `maximumShownRepliesPerLevel` cutoff; `removeCommentById` decrements only the *direct* parent's `replyPagination.count` (top-level pagination is the container's job).
4. **`CommentsSection` prefers `modelId` when both props are set** and renders nothing (plus a dev `console.warn`) when neither is set; local ids are `local-<counter>` per component instance (no `Date.now()`/`Math.random()`).

## 2026-07-10 — Comments: see-more reveal-then-load semantics + shared tree defaults

**Context:** Bug-fix pass on `app/components/comment/` (BUGS.md 5, 6, 7, 8-residual, 9, 14, 16).

**Decisions:**
1. **See-more is reveal-first, load-second.** `CommentView` keeps a per-node `revealedCount` ref seeded ONCE from `maximumShownRepliesPerLevel` (it does not track later prop changes; the `:key`ed recursion makes state per comment id). One click reveals ALL remaining locally loaded replies; only when everything loaded is visible does see-more show the clamped server remainder (`replyPagination.count - replies.length`, ≥ 0) and a click then emits `load`. So `load` now strictly means "fetch what isn't loaded" — a page-append handler must not worry about duplicating locally hidden replies.
2. **`comment-tree.ts` contract changed:** `visibleReplies(comment, revealedCount)` and `remainingReplyCount(comment, revealedCount, maximumNested)` take the revealed window, not the per-level maximum/shown length; new pure helpers `hiddenLoadedReplyCount(comment, revealedCount)` and `serverRemainingReplyCount(comment)` split the two modes. At `maximumNested <= 0` `remainingReplyCount` still returns the FULL `replyPagination.count` — that feeds the continue-thread link. `remainingReplyCount` no longer goes negative, and a missing `replyPagination` no longer hides loaded-but-unrevealed replies.
3. **`COMMENT_TREE_DEFAULTS` (3 nesting / 2 shown, the panel's values) lives in `types.ts`** and backs both `CommentsPanel` and `CommentView` `withDefaults` — a standalone view now behaves like a panel-hosted one. Tests needing deeper/wider trees must pass explicit settings.
4. **`write` emits only on open/like/delete attempts; closing is never gated.** The action buttons still toggle (reply/edit button closes an open composer) but the close branch is silent and ignores `readOnly`, so a session expiry can't wedge an open input.

## 2026-07-10 — Comments: input clearing contract, dialog cancel semantics, panel readOnly

**Context:** Final bug-fix pass on `app/components/comment/` (BUGS.md 1, 2, 3, 4-residual, 10, 11, 12, 13, 15). BUGS.md is now historical: all 16 entries carry FIXED lines and the former `it.fails` pins run as regular regression tests in `bugs.test.ts`.

**Decisions:**
1. **`CommentInput` never clears itself; clearing is parent-owned via an exposed `clear()`.** Submit emits and keeps the text (so a rejected submission can't lose it). `CommentsPanel`'s top-level composer calls `clear()` through a template ref after emitting `create` — synchronous-optimistic today; restore-on-failure belongs at the `CommentsSection` `runOptimistic` seam once the backend lands. `CommentView`'s reply/edit inputs need no `clear()`: they unmount on close (`v-if`) and re-seed from `initialText` on reopen.
2. **Panel read-only is `props.readOnly || !user.isLoggedIn`** (local computed `isReadOnly`; the prop is never shadowed). Consumers can force read-only for logged-in users (locked/archived threads).
3. **`ConfirmDeleteCommentDialog`: every non-confirm close IS a cancel.** The dialog watches its `open` model and emits `cancel` on any `true → false` transition not flagged by the internal `confirming` ref (set only by the Delete button). The Cancel button just closes and lets the watcher emit — new dismissal paths (ESC, overlay, future close buttons) get cancel semantics for free.
4. **Enter submits, Shift+Enter newlines** in `CommentInput` via `@keydown.enter.exact.prevent` — `.exact` short-circuits before `.prevent`, so modified Enter reaches the textarea natively.
5. **`remainingCommentCount(comments, pagination)`** replaced the props-object signature; result clamps at ≥ 0. Panel-level load-more math is the only consumer.
6. **Linkifier keeps balanced trailing closers:** `splitTrailingPunct` re-attaches `)`/`]`/`}` from the stripped tail while the URL has more matching openers than closers; unbalanced closers stay stripped.

## 2026-07-10 — Comments: auth gating moved from CommentsPanel to CommentsSection

**Context:** `app/components/comment/` refactor. Supersedes decision 2 of the previous entry ("Panel read-only is `props.readOnly || !user.isLoggedIn`").

**Decisions:**
1. **`CommentsPanel` is auth-unaware.** Its `readOnly` prop (default `false`) is the only read-only source; it no longer calls `useUser` or shows the login toast, and it re-emits `write` upward. `CommentsSection` owns the session: effective read-only = `props.readOnly || !user.isLoggedIn` (new optional `readOnly` section prop), and it answers the panel's `write` emit with `showRequiresLoginToast("participate in discussions")` when logged out. Direct `CommentsPanel` consumers (the `theme.vue` demo) get no auth gating unless they pass `readOnly` themselves.
2. **The delete-dialog flow (including its success toast) stays in the panel** — it is local UI state, not session awareness; only the auth toast moved up.
3. **The BUG-3 regression pin moved to the section level** (`bugs.test.ts` → "CommentsSection bugs"): explicit `readOnly` respected while logged in, asserted through the mounted section. Panel tests now pin only the prop-driven contract; a shared `mountCommentsSection` helper lives in `tests/helpers/comment.ts`.

## 2026-07-10 — Comments: URL-driven comment highlight (`?highlightedCommentId=`)

**Context:** `app/components/comment/` feature. Any page that renders `CommentsSection` gets deep-link highlighting for free.

**Decisions:**
1. **The highlight lives on `CommentsSection`, seeded ONCE from `route.query.highlightedCommentId` at setup** (arrays and empty strings ignored; later URL changes don't re-arm it). It threads section → panel → recursive `CommentView` as the optional `highlightedCommentId` setting in `CommentViewSettings`.
2. **Dismissal is focus-based and literal:** the highlighted root gets `tabindex="-1"`, is scrolled (`scrollIntoView({ block: "center" })`) and focused (`preventScroll: true`) in `onMounted` (client-only, so SSR-safe); ANY `focusout` of that root — including clicking a button inside the comment — emits `highlight-dismiss`, which bubbles view → panel → section. The section then clears the ref and `router.replace`s the query with only `highlightedCommentId` removed.
3. **Highlight treatment:** primary-tinted `ring`/`bg` plus `p-2 -m-2` so the box gains breathing room without shifting content position.
4. **`CommentView` roots now carry `data-comment-id`** — a stable DOM hook for tests (and future scroll/anchor logic); tests select roots by it instead of Tailwind classes. Mocking `useRouter` via `mockNuxtImport` must include `afterEach` (a `vi.fn()` suffices) or `@nuxt/test-utils`'s own runtime setup crashes the suite.

## 2026-07-10 — Comments: thread page parent-thread navigation + root-derived copy

**Context:** `app/pages/models/[id]/comments/[commentId].vue`. Replies now carry `parentId?: string` on `Comment` (future backend shape; fixtures stamp it recursively via `stampTree`, roots stay undefined).

**Decisions:**
1. **The page reads the thread root by calling `useComments({ commentId })` itself** instead of having `CommentsSection` expose it via emit/slot. Both callers resolve to the same `useAsyncData` key (`comments:thread:<id>`), so Nuxt dedupes them into one shared fetch — verified under the nuxt test runtime with no duplicate-key warnings. When the real backend lands, only `fetchComments` changes and both consumers keep working.
2. **"See parent thread" renders only when the loaded root has a `parentId`** and links to `/models/<modelId>/comments/<parentId>` using the route's model id (consistent with "Back to model").
3. **The subtitle derives from the loaded root** ("The full conversation under <author>'s comment.") with the old generic sentence as the loading/absent fallback. `data-testid` hooks (`parent-thread-link`, `thread-subtitle`) keep tests off copy and classes.

## 2026-07-10 — Comments: dates and authors link out

**Context:** `app/components/comment/`. Every comment's relative date now links to its thread page and avatars/names link to author profiles.

**Decisions:**
1. **`CommentMetadataBar` stays presentation-only:** it takes an optional `threadLink?: string` prop (rendered as a muted `NuxtLink` with a hover affordance, plain span otherwise) instead of deriving the URL itself; `CommentView` passes its existing `threadLink` computed, so the "no modelId → no link" rule lives in one place.
2. **The avatar's profile link wrapper is `class="contents"`** so the anchor is layout-inert: the `UAvatar` keeps its own positioning classes and continues to anchor the spine/elbow drawing exactly as before.
3. **Fixture authors carry `/users/user-<name>` profile urls** matching the `/users/:id` route convention; the metadata bar's pre-existing name link lights up from the same `author.url`.
4. **The continue-thread button now carries `data-testid="continue-thread-link"`** — date links share the `/models/<id>/comments/<id>` href shape, so href-only selectors no longer disambiguate it in tests.
