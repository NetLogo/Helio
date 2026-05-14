# Search UI Plan

Companion to backend `legacy-migration-search-spec.md`. The backend is a spec doc, not a build plan — actual FTS implementation is deferred. This UI plan is correspondingly forward-looking: it captures the surface the frontend will need once the spec lands, plus what we can do today against the existing `ILIKE` placeholder.

## Backend surface (target)

```
GET /v1/search?q=<term>&type=<facet?>&limit=<n>&offset=<n>
→ { models, authors, tags } where each is Paginated<...>
```

`type` narrows to one facet; omitted returns all three. `q` is required and trimmed.

Result shapes:

- `models[]` — existing `modelCardResponseDtoSchema`. No UI changes — reuse `ModelCard`.
- `authors[]` — new lightweight `UserCard` DTO `{ id, name, avatar?, modelCount? }`. New component.
- `tags[]` — existing `TagCard` already in `components/tag/`.

The current `searchModelsQuery` (LIKE-based) stays as the fallback model-only search and the existing `/models` filter UX continues to work.

## Routing — open question

The backend response shape is faceted; the UI for it has two reasonable shapes.

**Option A: dedicated `/search` route.**
- `pages/search.vue` reads `?q=&type=` from URL.
- Tabs across the top: `All`, `Models`, `Authors`, `Tags`.
- `All` tab renders three sections (top 3 of each facet + "see all in this tab").
- Per-facet tabs render the full paginated list.
- Existing `/models` stays as the browse/filter page (no search box — that lives in the navbar).

**Option B: extend `/models` with author + tag facets inline.**
- The existing page grows two collapsible sections above the model grid.
- Less navigation, but couples search semantics with browse/filter and forces every facet to share the same `useModels`-style URL state.

**Recommendation:** Option A. The backend response is explicitly faceted, the `type` query param signals it wants its own URL surface, and browse-and-filter is a different mental model than search-by-term. Confirm at implementation time.

Either way, the existing `components/ui/SearchBar.vue` (already in the navbar) just routes to `/search?q=...` (Option A) or `/models?q=...` (Option B).

## Components (Option A)

Under `components/search/`:

- `SearchResultsPage.vue` — top-level layout. Reads `q` and `type` from `useRoute().query`. Renders the tabs, dispatches to the facet-specific body.
- `SearchFacetTabs.vue` — `UTabs` with counts per facet ("Models (47)", etc.). Counts come from the response's `total` per `Paginated`.
- `SearchResultsModels.vue` — paginated grid of `ModelCard`. Reuses the `ModelCards` component for layout.
- `SearchResultsAuthors.vue` — paginated grid of `UserCard` (new). Each card: avatar, name, "N models", click → `/users/:id`.
- `SearchResultsTags.vue` — paginated grid of existing `TagCard`. Click → `/tags/:name`.
- `SearchEmpty.vue` — empty-results state. Variants: empty query (`Type something to search`), no results (`No matches for "{q}". Try a shorter or different term.`), partial results (`No models matched, but we found 3 authors and 2 tags.` — the cross-facet hint).

`UserCard.vue` (under `components/user/`):

- Mirrors `TagCard.vue`'s shape — a `BaseCard` with avatar, name, model count.
- Reuse `UserAvatar`.
- Independent of search; useful elsewhere when we want a lightweight user reference.

## Composable

`useSearch(q, type?)`:

- `useAsyncData` keyed `search-${q}-${type ?? 'all'}-${page}`.
- Watches `q` and `type` refs so URL changes refetch.
- Returns `{ models, authors, tags, loading, error }`.
- Honors `?limit` / `?offset` from URL via existing `useApiPagination`.

The URL is the source of truth. Reuse the URL-sync pattern from `useModels`: register `q`, `type`, `page` as `queryFilters`; hydrate refs on mount; `watch` selected refs back to `setFilter`.

## Search bar behavior

The existing `SearchBar.vue` in the navbar:

- Submits on Enter → `navigateTo('/search?q=...')`.
- Optional: instant typeahead is **out of scope** per backend ("Auto-suggest / typeahead. Out of scope; separate endpoint when needed.").
- Clears on `Esc`.
- Keyboard shortcut to focus: `/`. Existing pattern from many product UIs.

## Highlighting matched terms

Render the search term highlighted in result cards (model title, author name, tag name). Two paths:

1. **Client-side regex highlight.** Tokenize the query, wrap matches in `<mark>` after string-escape. Cheap. Doesn't match the backend's stemmed `tsvector` (`running` and `run` won't both highlight), but is fine for a v1.
2. **Backend-provided highlight snippets.** PostgreSQL has `ts_headline`. Not in the spec; flag as a follow-up if/when v1 highlighting feels off.

**Recommendation:** client-side highlight for v1. Wrap the logic in `utils/highlight.ts`.

## UX details

- **Per-facet pagination:** `page` query param scopes to the active tab. Switching tabs resets `page` to 1.
- **Cross-facet hint when one facet is empty:** if `models` is empty but `authors` / `tags` have hits, the empty state on the Models tab nudges toward the populated tabs.
- **Loading state:** facet count chips show `…` while loading; result grids show skeletons (`ModelCardSkeleton`, `TagCardSkeleton`, and a new `UserCardSkeleton`).
- **Empty `q`:** the page renders a friendly prompt and a list of popular tags (via existing `getPopularTagsSummary` in `utils/api.ts`) — a starting point that doesn't waste the screen.

## Search analytics — deferred

Backend flagged search logging as a separate ticket. Frontend hook is trivial: fire a fire-and-forget `POST /v1/search/log` (when it exists) from the page's `onMounted`. Not in MVP.

## Edge cases

- **Visibility filter on the backend:** the spec is explicit that visibility is enforced in SQL. Frontend trusts this; no client-side filter. Private models that the caller can read appear in the same list as public; tag the card with a small `Private` badge (the `modelCardResponseDtoSchema` already includes `visibility`).
- **Long queries:** cap at 200 chars on the client to match a reasonable backend `tsquery` budget.
- **Empty after trim:** treat `?q=   ` as empty and show the prompt state.

## Out of scope

- Typeahead / auto-suggest. Separate spec.
- Saved searches.
- Sort options other than relevance (the backend's `ts_rank_cd` rank). When users want chronological, they use `/models` browse.
- Per-result highlight snippets via `ts_headline`. Defer.
- Multi-language stemming.

## Open questions

- **Routing: Option A vs. Option B.** Recommend A; confirm at implementation.
- **What `q=` does on `/models`:** Option A keeps `/models` search-free (just filters). Option B keeps it. Pick at the same time as the routing decision.
- **UserCard model-count surfacing:** the backend `UserCard` DTO is sketched as id + display name + count hint. Confirm `modelCount` is part of v1 vs. requires a separate hop.

## Reuse checklist

- `ModelCard`, `ModelCards`, `ModelCardSkeleton`.
- `TagCard`, `TagCardSkeleton`.
- `BaseCard.vue` wrapper for the new `UserCard`.
- `useAsyncData`, `useApiPagination`.
- The `useModels` URL-sync pattern.
- `utils/sanitize.ts` for safely rendering highlighted strings.
- `components/shared/Empty.vue`.

## Until FTS lands

Until the backend ships real FTS, the navbar `SearchBar` should still route somewhere useful. Two options:

1. Route to `/models?q=` so the existing LIKE-based filter handles model search and authors/tags are unreachable from the navbar.
2. Build the `/search` page now against the existing endpoints (call `searchModels` for the models facet, leave authors/tags empty with `Coming soon` placeholders). Less wasted work when FTS lands.

**Recommendation:** option 2 — build the routes now, light up facets as endpoints ship.
