# Legacy Migration: Search (Spec)

High-level spec for migrating legacy `SearchController` and the various ad-hoc model search paths to PostgreSQL full-text search. This is a **scope and decision** doc, not a build plan. Implementation work is deferred until storage strategy is decided.

Related: [[legacy-migration-fork-graph-plan]], [[legacy-migration-collaborations-plan]].

## Framing

Legacy `SearchController#search_action` ran four parallel queries — `Node.search`, `Person.search`, `Tag.search`, and `Version.text_search` — then post-filtered the union in Ruby for visibility and split the "version content" matches into "info" vs "procedures" buckets by re-scanning the strings in memory. The new shape is a single faceted endpoint over PostgreSQL FTS, with visibility applied at the SQL layer.

The existing implementation at `src/modules/model/queries/search-models.query.ts` and `src/modules/model/database/model.search.ts` is `ILIKE '%keyword%'` on `versions.title` and `versions.description` only. It does not search procedures, info tabs, tags, or authors. It is functionally a placeholder.

## Surface area

Single endpoint:

```
GET /v1/search?q=<term>&type=<facet?>&limit=<n>&offset=<n>
```

- `q` — search term. Required, non-empty after trim.
- `type` — optional facet narrow: `models | authors | tags`. Omit to return all three facets.
- `limit`, `offset` — pagination. Cap `limit` at 50.

Response (faceted):

```ts
{
  models:   Paginated<ModelCard>,
  authors:  Paginated<UserCard>,
  tags:     Paginated<TagCard>,
}
```

When `type` narrows, the omitted facets are returned as empty `Paginated` shells, so the client always receives the same shape.

`ModelCard` is the existing `modelCardResponseDtoSchema`. `UserCard` and `TagCard` are new lightweight DTOs (id + display name + a count hint).

## Data model — open questions

Where the *searchable text* for a model version lives is the single biggest unresolved question. Three options on the table; pick later.

- **(A) Denormalize onto `ModelVersion`.** Add `infoText TEXT`, `codeText TEXT`, and a `searchVector tsvector` generated column (`title || description || infoText || codeText`). GIN index on `searchVector`. Pros: single table to query, ranking is trivial, generated column stays in sync without app code. Cons: bloats the version row; recomputing `searchVector` on every write touches a wide row.
- **(B) Separate `ModelVersionSearchIndex` table.** Composite PK `(modelVersionId)`, holds `searchVector` + raw text columns. Pros: keeps `ModelVersion` lean; can rebuild independently. Cons: extra join in every search query; extra write in every version commit; can drift if the indexer fails.
- **(C) Background pgboss indexer.** Emit `model.version.published` (already exists), have a pgboss handler write to either (A) or (B) asynchronously. Pros: doesn't slow finalize. Cons: search lag; visible "I just published and can't find it" UX bug.

Additional open data-model questions:

- Do we extract procedures text at upload time (synchronous, blocks finalize) or async (event-driven)? Tied to (A)/(B)/(C) above.
- Reindex strategy on version edit (do we even allow that?) and version delete (soft delete shouldn't surface; how do we exclude?).
- What gets searched: latest version only, or all versions ever? Legacy searched all versions. Recommend: latest only for MVP.

## Schema sketch (not final)

If we go with option (A), the Prisma migration looks roughly:

```sql
ALTER TABLE "ModelVersion"
  ADD COLUMN "infoText" TEXT,
  ADD COLUMN "codeText" TEXT,
  ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')),       'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(infoText, '')),    'C') ||
      setweight(to_tsvector('english', coalesce(codeText, '')),    'D')
    ) STORED;

CREATE INDEX "ModelVersion_searchVector_idx"
  ON "ModelVersion" USING GIN ("searchVector");
```

For Model (title-only fallback for legacy queries), we may also want a generated column on title — TBD.

## Query sketch

Illustrative shape for the model facet — not a final implementation:

```sql
SELECT m.id, ts_rank_cd(mv."searchVector", q) AS rank
FROM "Model" m
JOIN "ModelVersion" mv
  ON mv.id = m."latestVersionId"
,    plainto_tsquery('english', $1) q
WHERE mv."searchVector" @@ q
  AND m."deletedAt" IS NULL
  AND (
    m.visibility = 'public'
    OR ($2::uuid IS NOT NULL AND EXISTS (
         SELECT 1 FROM "ModelAuthor" a
         WHERE a."modelId" = m.id AND a."userId" = $2
       ))
    OR ($2::uuid IS NOT NULL AND EXISTS (
         SELECT 1 FROM "ModelPermission" p
         WHERE p."modelId" = m.id AND p."granteeUserId" = $2
       ))
  )
ORDER BY rank DESC, m."createdAt" DESC
LIMIT $3 OFFSET $4;
```

Visibility predicates must mirror the ones in `src/modules/model/database/model.search.ts` (`buildModelWhere`); both code paths should derive from a shared helper.

## Authors and tags facets

These are simpler — neither holds long-form text.

- **Authors:** match `User.name` and `User.username` with `pg_trgm` similarity (or `ILIKE` for MVP). Order by `similarity` desc.
- **Tags:** match `Tag.name` with `pg_trgm`. Order by similarity, then by count of tagged models.

Both should be reusable by the model facet for "author match" / "tag match" hits as in the legacy controller, but exposed as separate facet results in the response.

## Visibility filter

Must run in SQL. Post-filtering in JS breaks pagination — you can ask for 20 results, post-filter down to 4, and end up with broken offsets.

The same predicate set applies as in `buildModelWhere`:

- `deletedAt IS NULL`
- visibility `public`, OR caller is an author, OR caller has a `ModelPermission`.

Tags/authors don't have visibility — anyone can search any user / any tag. The filter only kicks in when we *project the matching models* under the author/tag facet (we must still hide the models themselves if the caller can't see them).

## Ranking and boost

`ts_rank_cd` over the weighted `searchVector` (the `setweight` calls above). Suggested weighting:

- title -> A (highest)
- description -> B
- info tab -> C
- code -> D (lowest)

Author and tag matches don't go through `ts_rank_cd` — they're scored by `pg_trgm` similarity. When merging facets in the response, the client decides how to render relative weights; the backend doesn't try to unify scores across facets.

## Open questions

- **Typo tolerance.** Do we want fuzzy match? `pg_trgm` is cheap and gives "did you mean" behavior. Recommend yes for authors/tags, no for model body (`tsvector` already stems).
- **Language stemming.** English-only via `to_tsvector('english', ...)`. Most NetLogo models are English; non-English models will rank worse but still match exact tokens. Multi-language support is out of MVP.
- **Multi-tenancy / workspaces.** Future feature. Spec assumes flat user space.
- **Pagination.** Cursor or offset? Offset is simpler and search results tend to be browsed at the top — recommend offset. Revisit if we ever expose stable links to deep results.
- **Search analytics.** Should searches be logged for product analytics (popular terms, zero-result queries)? Not part of this spec; flag as a separate ticket.
- **Auto-suggest / typeahead.** Out of scope; separate endpoint when needed.

## Out of scope (for this spec)

- Implementation. This is a scope doc. A follow-up plan, written once a storage option (A/B/C) is chosen, covers the actual migration: Prisma migration, mapper changes, indexer wiring if applicable, route registration, tests.
- Removing or modifying the existing `searchModelsQuery` / `searchModelsCardQuery`. They stay as the fallback while FTS is built.
- Frontend search UI.

## References

- Legacy: `/Users/pas6148/Documents/netlogo/modelingcommons/app/controllers/search_controller.rb` (LIKE-and-Ruby-post-filter approach being replaced).
- Existing LIKE-based fallback: `src/modules/model/queries/search-models.query.ts`, `src/modules/model/queries/search-models-card.query.ts`, `src/modules/model/database/model.search.ts` (this is the code path the new FTS query replaces — preserve the visibility predicate logic when migrating).
- DTO baseline: `src/modules/model/dtos/model.card.dto.ts`.
