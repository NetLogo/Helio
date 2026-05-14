# Discussion UI Plan

Companion to backend `legacy-migration-discussion-plan.md`. Fills in the existing `ModelDiscussionTab.vue` stub with the threaded-comment UI backed by the new `model-comment` module.

## Backend surface

- `POST /v1/models/:modelId/comments` — create (with optional `parentCommentId`)
- `GET /v1/models/:modelId/comments` — full tree, deleted nodes included as tombstones
- `PATCH /v1/comments/:commentId` — edit body (author only)
- `DELETE /v1/comments/:commentId` — soft-delete (author or admin)

Comments are stored as raw markdown; frontend owns parsing + sanitization. Deleted nodes arrive with `body=null`, `author=null`, `userId=null`, `deletedAt` set.

## Library choices

- **Markdown:** `marked` + `DOMPurify`. The repo already has `utils/markdown.ts` and `utils/sanitize.ts` — reuse and extend rather than add new deps. Audit those first; if they're not already this pair, switch them.
- **Relative timestamps:** existing `utils/formatters.ts` should already have a relative-date helper (used elsewhere). Reuse.

## Component tree

Under `components/model-detail/discussion/`:

- `ModelDiscussionTab.vue` — already exists as a stub. Replace the empty-state body with `<DiscussionThread :model-id="modelId" />`. Keep the existing tab shell.
- `DiscussionThread.vue` — top-level fetcher. Renders the new-top-level composer at the top, then a list of `DiscussionNode`s for the root nodes.
- `DiscussionNode.vue` — recursive. Renders one comment node:
  - Tombstone projection if `deletedAt != null`: muted `[deleted]` placeholder, no avatar, no actions, replies still render.
  - Normal: avatar, author name → `/users/:id`, relative timestamp, `(edited)` if `updatedAt > createdAt`, rendered markdown body, action row (`Reply` / `Edit` / `Delete` / `Report`).
  - Replies render in-place via `<DiscussionNode v-for="r in node.replies" :node="r" />`.
- `CommentComposer.vue` — markdown textarea with a tab-toggleable preview pane, character counter (10,000 max), submit + cancel. Used for new top-level, reply, and edit (controlled via props for placeholder / submit handler).
- `MarkdownBody.vue` — pure renderer; takes a raw markdown string, returns sanitized HTML in a styled `prose` container. Reused outside discussions for any user-authored markdown (long-form model description, etc.).

The recursion has no hard depth cap on the backend. Visually flatten to a fixed indent past depth 4 (matches Reddit/Lobsters convention). No code change to the data fetch.

## Composable

`useModelComments(modelId)`:

- Fetches the tree via `useAsyncData('comments-${modelId}', …)`.
- Exposes `tree` (the array), `loading`, `error`.
- Mutations: `post(body, parentCommentId?)`, `edit(commentId, body)`, `remove(commentId)`. All refetch on success — the tree is rarely huge and refetch keeps `updatedAt` in sync.
- Optimistic on `post`: insert a placeholder node into the tree with a temp id and a `pending: true` flag, replace from server response on success, drop on failure. Edit and delete are NOT optimistic — the wait is short and the consistency win for `(edited)` flags / tombstones is worth it.

## UX details

- **Markdown affordances:** the composer shows the standard markdown hint line ("**bold**, *italic*, `code`, [link](url)") under the textarea. No toolbar. The preview tab is the discoverability lever.
- **Edit:** in-place. The comment body morphs into a composer prefilled with the existing body; on save it morphs back. `Cancel` reverts without a confirm — unsaved typing is the user's responsibility.
- **Delete confirm:** `useToast({ actions: [{ label: 'Undo' }] })` doesn't work for delete (server already soft-deleted). Use a lightweight `UModal` confirm. The backend supports admin-delete for any comment; show the action whenever `caller.systemRole === 'admin' || caller.id === comment.userId`.
- **Permissions surfacing:** unauthenticated users can read the thread but the composer renders a `UAlert` with a `Sign in to reply` button instead of the textarea. No partial states — either you can post or you can't.
- **Auto-link to a specific comment:** `/models/:slug/:id#comment-:commentId` should scroll to and briefly highlight that node. Backend doesn't paginate; a `nextTick` scroll + 1s background flash is enough.
- **Report a comment:** the action button fires the reporting flow (see `reporting-ui-plan.md`) with `resourceType: 'comment'`. Gated on the backend reporting module's `comment` enum value landing.

## Edge cases

- **Author hard-deleted (rare):** backend returns `author=null` even if `deletedAt=null` on the comment. Render as `[unknown user]`. No action affordances on the row except `Report` / admin `Delete`.
- **Cross-model parent attempt:** can't happen from this UI (`parentCommentId` always comes from a node in the same tree), but if a 400 bubbles up, surface a non-blocking toast and refetch.
- **Edit window:** backend currently has no window (open question on backend plan). UI matches — edit is always available to the author. If/when the backend introduces a 15-min lock, the response should include an `editableUntil` and the action row hides past that timestamp.

## Markdown sanitization (security)

The backend stores raw markdown unsanitized. The frontend MUST:

1. Parse with `marked` configured to **not** allow raw HTML inline (`{ headerIds: false, mangle: false }` and disable HTML pass-through).
2. Run the resulting HTML through `DOMPurify` before binding via `v-html`. Default DOMPurify config is fine; explicitly disallow `style`, `srcset`, and `on*` attributes.
3. Add a `noopener noreferrer` on every rendered `<a>`. DOMPurify hook or post-process the result string.

Sanitization lives in `utils/markdown.ts`. `MarkdownBody.vue` calls it once per body change (computed). Never trust the raw `body` string in templates.

## Pagination — when

Backend currently returns the full tree per request. The plan accepts this until a single model crosses ~500 comments. UI should:

- Render the whole tree until that threshold becomes a real problem.
- If we hit it: the backend has a planned cursor over `(createdAt, id)` for top-level threads. Mirror it with a `Load more replies` affordance per top-level branch — no infinite scroll, since deep threads make it disorienting.

## Reuse checklist

- `components/user/UserAvatar.vue` — comment author avatar.
- `utils/markdown.ts` + `utils/sanitize.ts` — parsing pipeline.
- `utils/formatters.ts` — relative timestamps.
- `useToast()` — confirms and errors.
- `useAsyncData` keyed `comments-${modelId}`.

## Out of scope

- @mentions, reactions, attachments. All deferred at the backend.
- Q&A semantics (`is_question`, `answered_at`) — dropped permanently.
- In-app notifications inbox.
- Email preferences ("don't notify me on my own model"). Deferred globally.

## Open questions

- **Sort order:** chronological vs. "best" (likes-weighted). Chronological matches a forum mental model and the data we have. Defer ranking until likes-on-comments exists.
- **Markdown preview pane toggle vs. always-on split:** toggle is cheaper screen real estate on mobile; split is faster feedback on desktop. Start with toggle, revisit.
- **Deep-link highlight color:** picking a token from the Nuxt UI palette — `primary` for one second feels right but worth a designer check.
