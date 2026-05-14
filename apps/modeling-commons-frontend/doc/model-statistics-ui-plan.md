# Model Statistics UI Plan

Companion to backend `model-statistics-plan.md`. Wires likes, views, runs, downloads, and shares into the UI surface.

## Backend surface

**Likes** (auth required):
- `POST /v1/models/:id/like` — idempotent like.
- `DELETE /v1/models/:id/like` — idempotent unlike.
- `GET /v1/models/:id/likes` → `{ count, likedByMe }`.

**Interactions** (auth optional):
- `POST /v1/models/:id/views` / `/runs` / `/downloads` / `/shares` — optional body `{ versionNumber? }`. Anonymous allowed.
- `GET /v1/models/:id/interactions` → `{ likes, views, runs, downloads, shares, likedByMe }`.

Card endpoints (`getModelCardQuery`) are extended to embed these counts directly — no extra hop needed on listings.

A `_mc_uid` cookie is issued globally for cross-session anonymous dedup. The frontend doesn't read it; it just lets the browser send it back.

## Existing surface

- `components/model-shared/ModelLike.vue` — presentational button, emits `toggle`. Wire it up.
- `components/model-shared/ModelStats.vue` — counts row. Wire it up.
- `composables/useModelInteractions.ts` — already exists, uses raw `fetch` for fire-and-forget. Align with the new endpoint shape.

So the work is largely **wiring existing components**, not building new ones.

## Composable updates

`useModelInteractions(modelId)`:

- Keeps its raw `fetch` fire-and-forget pattern for `views` / `runs` / `downloads` / `shares` (already documented in repo CLAUDE.md as the right approach until types regenerate).
- After backend types regenerate, migrate to `useApi()` calls.
- Adds:
  - `like()` / `unlike()` — optimistic, with rollback on failure (idempotent on the server so a stale state is recoverable).
  - `recordView()` — fire-and-forget; called once per (model id, page visit). Guard with a small in-memory `Set` so React-style strict-mode mounts don't fire twice.
  - `recordRun()` — called when the embedded NetLogo runtime emits its `run` event (whatever signal `NetlogoWebEmbed.vue` exposes; add one if not).
  - `recordDownload()` — called from the download button click handler.
  - `recordShare()` — called when the share button copies a link or fires a native share.

State refs:

- `liked` (boolean, derived from server response, optimistically toggled).
- `counts` (`{ likes, views, runs, downloads, shares }`, server-sourced, refetched as a unit when needed).
- `busy` (boolean during like/unlike). Locks rapid re-entry.

## Wiring points

### Model cards (browse / search / profile lists)

`ModelCard.vue` already has space for stats; `ModelStats.vue` surfaces the counts. Read the counts directly from the card payload (backend embeds them now). No new fetches per card.

The like button on a card is **optional**:

- **Recommendation:** show it. Most product UX has the heart on every card. Wire it through `useModelInteractions(modelId)`.
- The optimistic update lives in the composable; the card just consumes `liked` and calls `like()`/`unlike()`.

### Model detail page

`ModelHeader.vue` and `ModelBottomBar.vue` already have action rows. Wire:

- **Like:** `ModelLike` in the bottom bar (already wired visually). Connect to `useModelInteractions().like / unlike`.
- **Download:** existing button — wrap the click in `recordDownload()` before triggering the file fetch.
- **Share:** existing button — wrap the click in `recordShare()` either after `navigator.clipboard.writeText(url)` resolves or after the native share sheet returns.
- **View:** fire `recordView()` from `pages/models/[id].vue`'s `onMounted`. The fire-and-forget already exists; just guard against double-fire on the same render.
- **Run:** `NetlogoWebEmbed.vue` should expose a `@run` event from the embedded simulator's "Setup" → "Go" flow. Fire `recordRun()` on it. If the embed has no such event, add one (the embed lives in `components/netlogo/`).

### Profile / user pages

Optional: surface aggregate likes received and total models on the user header. Backend doesn't have a "likes received" rollup endpoint — defer.

## UX details

- **Like button:**
  - Authenticated, not liked: outline heart. On click, fills with primary, count bumps by 1 optimistically.
  - Authenticated, liked: filled heart. Click un-likes, count drops by 1.
  - Unauthenticated: clicking opens a small popover ("Sign in to like models") with a link to `/login?back=…`. Don't pretend to like without a session — confusing.
  - `busy` disables the button for the duration of the request. Re-entry is gated on response.
- **Counts display:** integer with k/m suffix beyond 1,000 (`1.2k`, `3.4m`). Helper in `utils/formatters.ts` (likely already there).
- **View dedup:** server handles the 30-min window via `(modelId, userId|ipHash, sessionId)`. Frontend just guards against re-firing on the same page load.
- **Share button behavior:** on devices with `navigator.share`, use it (`{ title, url, text }`). Otherwise copy to clipboard and toast. Either way, fire `recordShare()` on success.
- **Anonymous interactions:** views/runs/downloads/shares all work without a session. Likes do not — that's intentional per backend ("Likes require auth").

## Edge cases

- **Optimistic like rollback:** if `POST /v1/models/:id/like` fails (network), revert `liked` and the count delta, toast a non-blocking "Couldn't save your like". Keep the `busy` reset so the user can retry.
- **Idempotent semantics:** double-clicks during `busy` are ignored. If somehow two POSTs arrive, the server handles idempotently (no count drift).
- **`likedByMe` becomes stale across tabs:** acceptable. Refetch on tab focus (`useEventListener('focus', refetch)` from VueUse, or a small inline listener) if it becomes a real issue.

## Self-interactions

Per backend: self-views / self-runs by the author count, matching GitHub / YouTube convention. UI doesn't filter them. If product later wants to exclude, the backend has the `excludeAuthors` filter as a future option.

## Cookie banner

The `_mc_uid` cookie is functional (used for dedup), not advertising. Under GDPR it's typically permitted under legitimate-interest with disclosure. **Decision:** mention in the privacy policy; do not block usage on a cookie banner consent. If legal requirements change, gate behind a banner consent flag.

## Edge cases (anonymous)

- **Visitor with `_mc_uid` disabled:** server falls back to `ipHash + sessionId`. Some over-counting on shared NATs is acceptable.
- **First-ever visit (no `_mc_uid` yet):** server middleware mints it on the response; subsequent requests carry it. The very first interaction may not dedupe but every subsequent one does.

## Out of scope

- Public analytics dashboard (e.g., "this model got 1k views this week").
- Like history / "models I've liked" page. Easy follow-up once `GET /v1/users/:id/likes` exists.
- Per-version interaction counts (versionNumber in the payload is captured server-side for future use; UI doesn't split by version yet).
- Server-issued share tokens for attribution.
- Geo enrichment / map visualization.

## Open questions

- **Show or hide like on cards:** recommend show. Confirm.
- **Animated heart on like:** small scale-and-fade pulse is satisfying and easy. Add unless designer pushes back.
- **Share semantics on mobile vs. desktop:** native share sheet vs. clipboard. Currently planned to detect and pick; confirm.

## Reuse checklist

- `components/model-shared/ModelLike.vue` and `ModelStats.vue` — exist; wire up.
- `composables/useModelInteractions.ts` — exists; extend.
- `useToast()` for share copy success and like-failure non-blocking errors.
- `utils/formatters.ts` for count formatting.
- `useUser()` for the unauthenticated-like popover gate.
