# Recommended Models — feature plan

## 1. Title and framing

A read-only endpoint that, given a source model, returns a small set of "related models / you might also like" cards. It is intended to surface on the model detail page (right-rail or below-the-fold strip) and, optionally later, in a homepage carousel. The endpoint produces a *stochastic* result: every request re-samples from a deterministic top-K candidate pool, so a refresh surfaces different but still-relevant picks. This keeps the UI feeling alive without requiring a personalization layer.

Frontend work (placement, carousel, loading states) is out of scope here.

## 2. New files / touched files

New:

- `src/modules/model/queries/recommended-models.query.ts` — query handler (factory, matches `search-models.query.ts` shape).
- `src/modules/model/dtos/recommended-models.response.dto.ts` — `{ items: ModelCardResponseDto[] }`.
- `src/modules/model/database/model-recommendations.sql.ts` — exports the scoring SQL string (and a tiny `runRecommendationScoring(db, ...)` helper). Keeping the SQL here makes it testable in isolation and reusable when a homepage "trending" endpoint wants the same blend.
- `src/modules/model/database/weighted-sample.ts` — Efraimidis–Spirakis weighted-without-replacement sampler. Pure function, RNG-injectable.
- `prisma/migrations/<timestamp>_pg_trgm_and_model_title_index/migration.sql` — adds `pg_trgm` extension + GIN trigram index on `ModelVersion.title` (see §3).

Touched:

- `src/modules/model/model.route.ts` — register `GET /v1/models/:id/recommendations`.
- `src/modules/model/index.ts` — DI registration for `recommendedModelsQuery`, and add it to the `Dependencies` augmentation.

## 3. Schema and indexes

No new tables. The data already exists: `Model.parentModelId`, `ModelAuthor(modelId, userId)`, `ModelLike(modelId, userId)`, and tags via `ModelVersionTag(modelId, versionNumber, tagId)`. Two important schema realities:

- **Tags hang off `ModelVersion`, not `Model`.** There is no `ModelTag(modelId, tagId)` join. Tag overlap must be evaluated against the source's *latest* version (`Model.latestVersionNumber`) and each candidate's latest version. The `modelCardArgs` include already exposes this shape; the scoring SQL mirrors it.
- **Title also lives on `ModelVersion`, not `Model`.** Trigram similarity therefore indexes `ModelVersion.title`, restricted (via the join) to the latest version of each model.

### `pg_trgm` extension

No existing migration enables `pg_trgm` — `grep -rn 'pg_trgm\|CREATE EXTENSION' prisma/` is empty. Add a new Prisma migration:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_model_version_title_trgm
  ON "ModelVersion"
  USING gin (title gin_trgm_ops);
```

Reflect the extension in `prisma/schema.prisma` via `previewFeatures = ["postgresqlExtensions"]` on the generator and `extensions = [pg_trgm]` on the datasource so Prisma's drift detection stays happy.

### Existing indexes the query relies on (already in schema)

- `Model @@index([parentModelId])` — family proximity.
- `Model @@index([parentModelId, parentVersionNumber])` — same.
- `ModelVersionTag @@id([modelId, versionNumber, tagId])` and `@@index([tagId])` — tag overlap on both sides.
- `ModelAuthor @@id([modelId, userId])` and `@@index([userId])` — author overlap.
- `ModelLike @@index([modelId, createdAt])` — popularity tiebreak (uses `_count`).

Nothing missing here besides the trigram GIN.

## 4. Scoring SQL (Step 1 — deterministic top-K)

Executed via Prisma `$queryRaw`. Bound params: `$1 = sourceModelId`, `$2 = viewerUserId | null`, `$3 = K (default 30)`. The visibility predicate mirrors `buildModelWhere` in `src/modules/model/database/model.search.ts`; the [[permission-unification-plan]] will replace this inline subquery with `accessibleModelsWhere`.

```sql
WITH source AS (
  SELECT
    m.id,
    m."parentModelId",
    sv.title AS title,
    COALESCE(
      (SELECT array_agg(t."tagId")
         FROM "ModelVersionTag" t
         WHERE t."modelId" = m.id AND t."versionNumber" = m."latestVersionNumber"),
      ARRAY[]::text[]
    ) AS tag_ids,
    COALESCE(
      (SELECT array_agg(a."userId")
         FROM "ModelAuthor" a
         WHERE a."modelId" = m.id),
      ARRAY[]::text[]
    ) AS author_ids
  FROM "Model" m
  LEFT JOIN "ModelVersion" sv
    ON sv."modelId" = m.id AND sv."versionNumber" = m."latestVersionNumber"
  WHERE m.id = $1
),
candidate AS (
  SELECT
    c.id,
    cv.title AS title,
    c."parentModelId",
    -- tag overlap: count of shared tags on the candidate's latest version
    COALESCE((
      SELECT count(*)::int
      FROM "ModelVersionTag" ct, source s
      WHERE ct."modelId" = c.id
        AND ct."versionNumber" = c."latestVersionNumber"
        AND ct."tagId" = ANY (s.tag_ids)
    ), 0) AS tag_overlap,
    -- author overlap: binary 1/0
    (CASE WHEN EXISTS (
      SELECT 1 FROM "ModelAuthor" ca, source s
      WHERE ca."modelId" = c.id AND ca."userId" = ANY (s.author_ids)
    ) THEN 1 ELSE 0 END) AS author_overlap,
    -- family proximity: parent of source, child of source, or sibling of source
    (CASE
      WHEN c.id = (SELECT "parentModelId" FROM source) THEN 1
      WHEN c."parentModelId" = $1 THEN 1
      WHEN c."parentModelId" IS NOT NULL
        AND c."parentModelId" = (SELECT "parentModelId" FROM source) THEN 1
      ELSE 0
    END) AS family_proximity,
    -- title similarity: 0..1 via pg_trgm
    COALESCE(similarity(cv.title, (SELECT title FROM source)), 0) AS title_sim,
    -- popularity: like count (we add 1 in the score expression)
    COALESCE((SELECT count(*)::int FROM "ModelLike" l WHERE l."modelId" = c.id), 0) AS like_count
  FROM "Model" c
  LEFT JOIN "ModelVersion" cv
    ON cv."modelId" = c.id AND cv."versionNumber" = c."latestVersionNumber"
  WHERE c.id <> $1
    AND c."deletedAt" IS NULL
    AND c."latestVersionNumber" IS NOT NULL
    -- VISIBILITY: mirror buildModelWhere. Anonymous viewer → public only.
    AND (
      c.visibility = 'public'
      OR ($2 IS NOT NULL AND (
        EXISTS (SELECT 1 FROM "ModelAuthor" a WHERE a."modelId" = c.id AND a."userId" = $2)
        OR EXISTS (SELECT 1 FROM "ModelPermission" p WHERE p."modelId" = c.id AND p."granteeUserId" = $2)
      ))
    )
)
SELECT
  id,
  (
    3 * tag_overlap
  + 2 * author_overlap
  + 2 * family_proximity
  + 2 * title_sim
  + 1 * ln(1 + like_count)
  ) AS score
FROM candidate
-- skip totally-irrelevant rows: if every signal is zero except a tiny popularity contribution,
-- they only enter the pool when there's nothing better.
ORDER BY score DESC
LIMIT $3;
```

Notes:

- The five weights (`3, 2, 2, 2, 1`) are exported as named constants from `model-recommendations.sql.ts` so an implementer can tweak them without grepping SQL:
  - `W_TAG = 3`
  - `W_AUTHOR = 2`
  - `W_FAMILY = 2`
  - `W_TITLE = 2`
  - `W_POPULARITY = 1`
- The popularity term uses `ln(1 + like_count)`. If we later move to a denormalised counter (see [[model-statistics-plan]]), swap `like_count` for that column — the subquery is the only thing that changes.
- The query returns `{ id, score }`. The handler then fetches full card records for those IDs in a second query that reuses `modelCardArgs.include` from `model.card.record.ts`, preserving the candidate order for the sampler.

## 5. In-app weighted sampling (Step 2)

Algorithm: **Efraimidis–Spirakis weighted reservoir sampling without replacement.** For each item assign a key `u^(1/score)` where `u ~ Uniform(0,1)`, then take the top `n` by key. Single pass, no rebuilding.

```ts
export function weightedSample<T>(
  items: Array<{ item: T; score: number }>,
  n: number,
  rng: () => number = Math.random,
): T[] {
  if (n >= items.length) return items.map((i) => i.item);
  const keyed = items.map(({ item, score }) => {
    const w = Math.max(score, Number.EPSILON);
    const u = rng();
    return { item, key: Math.log(u) / w };
  });
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, n).map((k) => k.item);
}
```

Two implementation details:

- Use `log(u) / w` rather than `u^(1/w)` to avoid underflow when `w` is small.
- Bias knob: before sampling, transform scores via `score^EXPONENT` (default `1.5`) to bias slightly toward the higher-scored items. Exposed as `SAMPLING_EXPONENT` constant in `model-recommendations.sql.ts` next to the weights. Hardcoded for MVP — see §12.

## 6. Query handler shape

`src/modules/model/queries/recommended-models.query.ts`. Mirrors `search-models-card.query.ts` (closest sibling).

```ts
import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import type { ModelCardResponseDto } from '#src/modules/model/dtos/model.card.dto.ts';
import { modelCardArgs } from '#src/modules/model/database/model.card.record.ts';
import {
  recommendationScoringSql,
  SAMPLING_EXPONENT,
} from '#src/modules/model/database/model-recommendations.sql.ts';
import { weightedSample } from '#src/modules/model/database/weighted-sample.ts';

const TOP_K = 30;

export default function makeRecommendedModelsQuery({
  db,
  getModelCardQuery,
}: Dependencies) {
  return {
    async execute(
      modelId: string,
      viewerUserId: string | null,
      limit: number,
      rng: () => number = Math.random,
    ): Promise<ModelCardResponseDto[]> {
      const source = await db.model.findFirst({
        where: { id: modelId, deletedAt: null },
        select: { id: true },
      });
      if (!source) throw new ModelNotFoundError(modelId);

      const scored = await db.$queryRawUnsafe<Array<{ id: string; score: number }>>(
        recommendationScoringSql,
        modelId,
        viewerUserId,
        TOP_K,
      );
      if (scored.length === 0) return [];

      const sampledIds = weightedSample(
        scored.map((row) => ({
          item: row.id,
          score: Math.pow(Math.max(row.score, 0), SAMPLING_EXPONENT),
        })),
        Math.min(limit, scored.length),
        rng,
      );

      const records = await db.model.findMany({
        where: { id: { in: sampledIds } },
        ...modelCardArgs,
      });
      const byId = new Map(records.map((r) => [r.id, r] as const));

      const ordered = sampledIds.flatMap((id) => {
        const rec = byId.get(id);
        return rec ? [rec] : [];
      });

      return Promise.all(
        ordered.map((rec) => getModelCardQuery.toResponse(rec, viewerUserId)),
      );
    },
  };
}
```

Notes that match existing patterns in `get-model-card.query.ts`:

- We reuse `getModelCardQuery.toResponse()` so the card shape is identical to `GET /v1/models/:id/card` and the search endpoints — single source of truth for the card mapper.
- The card mapper runs `modelInteractionRepository.countsByKindForModel` and `modelLikeRepository.existsFor` for each card. That's `2N` extra round-trips for `N = 6`. Acceptable at MVP; revisit if we hit the perf budget (see §11).

## 7. Route registration

In `src/modules/model/model.route.ts`:

```ts
import { recommendedModelsResponseDtoSchema } from '#src/modules/model/dtos/recommended-models.response.dto.ts';
import { modelIdParamsSchema, type ModelIdParams } from '#src/modules/model/dtos/model.dto.ts';

fastify.withTypeProvider<TypeBoxTypeProvider>().route({
  method: 'GET',
  url: '/v1/models/:id/recommendations',
  schema: {
    params: modelIdParamsSchema,
    querystring: Type.Object({
      limit: Type.Integer({ minimum: 1, maximum: 24, default: 6 }),
    }),
    response: { 200: recommendedModelsResponseDtoSchema },
    tags: ['Model'],
  },
  preHandler: [resolveModel('read')],
  handler: async (req, res) => {
    const items = await recommendedModelsQuery.execute(
      req.params.id,
      req.user?.id ?? null,
      req.query.limit,
    );
    return res.status(200).send({ items });
  },
});
```

Two things to be careful about:

- The route param is `:id` (not `:modelId`). `src/shared/hooks/resolve-model.ts` hard-codes `request.params.id` (line 7), so we stay consistent with every other model route in the file.
- `resolveModel('read')` already 404s hidden sources and 403s forbidden ones. No `requireAuth` — anonymous users are allowed (they get the public-only candidate set via the visibility predicate above).

DTO file `src/modules/model/dtos/recommended-models.response.dto.ts`:

```ts
import { Type, type Static } from 'typebox';
import { modelCardResponseDtoSchema } from '#src/modules/model/dtos/model.card.dto.ts';

export const recommendedModelsResponseDtoSchema = Type.Object({
  items: Type.Array(modelCardResponseDtoSchema),
});

export type RecommendedModelsResponseDto = Static<typeof recommendedModelsResponseDtoSchema>;
```

DI in `src/modules/model/index.ts`: add `recommendedModelsQuery` to the `Dependencies` interface (matching the pattern at lines 13–28) and register the factory in the module's awilix wiring.

## 8. Visibility integration

Today the SQL inlines a visibility predicate that mirrors `buildModelWhere` in `src/modules/model/database/model.search.ts:6–65`:

- Anonymous viewer → `visibility = 'public'`.
- Authenticated viewer → `public` OR (`private`/`unlisted` AND viewer is author or has a `ModelPermission` row).

This duplication is deliberate and **temporary**. The [[permission-unification-plan]] introduces a `accessibleModelsWhere(userId)` helper (and matching SQL fragment) that the search query, this recommendations query, and any future list-y endpoint will share. When that lands, replace the `AND (c.visibility = 'public' OR ...)` block in `model-recommendations.sql.ts` with the unified fragment. Until then, **mirror search behavior exactly** so a model that appears in `/v1/models/card` is the same one that can appear in `/v1/models/:id/recommendations`.

Source visibility is enforced by the `resolveModel('read')` preHandler — a viewer who can't see the source gets a 404/403 before this query runs.

## 9. Tests

Three test files, mirroring the colocation patterns already in `src/modules/model/database/model.search.spec.ts`.

### Unit: `src/modules/model/queries/recommended-models.query.spec.ts`

Mock `db.$queryRawUnsafe` and `db.model.findMany`. Assert:

- Source model id is passed as `$1` and never appears in the returned set.
- When `$queryRawUnsafe` returns 0 rows → returns `[]`, no second query fired.
- `scored.length < limit` → returns all scored, no error.
- The sampler is invoked with `score^SAMPLING_EXPONENT` weights.
- Card mapping reuses `getModelCardQuery.toResponse` (spy on it).
- Order of the returned array matches the sampler's output order.
- `viewerUserId` is forwarded both as a SQL param and to `getModelCardQuery.toResponse`.

### Unit: `src/modules/model/database/weighted-sample.spec.ts`

Statistical test (deterministic boundary cases first):

- `weightedSample([], n=5)` → `[]`.
- `n >= items.length` → returns all items.
- Score of 0 is permitted (clamped to `EPSILON`, vanishingly small selection probability).
- Distribution test: 10,000 trials over four items with scores `[1, 2, 3, 4]`, `n=1`. Assert empirical frequencies match normalized weights with relative error `< 10%`. (Standard low-flake threshold; can tighten if needed.)
- Use a seeded RNG (`mulberry32` or similar — keep the helper in the spec file, no new dep) so the test is reproducible.

### Integration: `tests/integration/recommended-models.test.ts`

Seed:

- Source model `S` with two tags `A`, `B`, one author `U1`.
- `M1` shares both tags `A`+`B` with `S`, different author → should score highest.
- `M2` shares only tag `A`, no author overlap.
- `M3` shares no tags, but has author `U1` → author-overlap bonus.
- `M4` no overlap at all, high like count → should appear only via popularity tiebreak.
- `M5` is a child of `S` (`parentModelId = S.id`) → family-proximity bonus.
- `M6` is soft-deleted → must never appear.
- `M7` is private, viewer is anonymous → must never appear.

Assertions:

- Endpoint returns 200 and a `{ items: ModelCard[] }` shape.
- `limit=2` returns exactly 2 items.
- With a seeded RNG injected into the handler, the test pins ordering and asserts the deterministic sample.
- 404 if the source is soft-deleted.
- Calling the endpoint twice without seeding produces at least one differing ordering across ~20 attempts (sanity check that randomness is wired).

Note: pinning the RNG in integration tests requires the DI container to read an `rng` registration. Register a `mathRandom` provider in `src/modules/model/index.ts` (default `Math.random`), have the query factory pull it from `Dependencies`, and override it in test bootstrap. This is the minimum-surface way to make the sampler deterministic without leaking randomness into route handlers.

## 10. RNG injection

The query handler's `execute(...)` accepts an optional `rng: () => number` parameter (defaults to `Math.random`). The route handler does **not** pass an `rng` — production is always `Math.random`. Tests pass a seeded RNG directly to `execute()` or override the DI registration. Document this on the handler with a one-line JSDoc:

```ts
/** @param rng inject a seeded RNG in tests; defaults to Math.random in prod. */
```

This is the pattern used today in `model.repository.ts:findRandomPublic` (uses `Math.random` inline) — we're making it injectable rather than inlining it because the recommendations sampler is the load-bearing source of randomness and we want it pinned in tests.

## 11. Performance notes

- The scoring CTE is `O(|candidates|)` with `candidates` bounded by the visibility predicate. Each per-row signal is either an index lookup (`ModelAuthor` PK, `ModelVersionTag` PK, `parentModelId` index) or a trigram-indexed similarity. At MVP scale (<100k models, <500k tags) this should comfortably stay under 30ms.
- The sample step is `O(K log K)` where `K = 30`. Negligible.
- Hot path per request: 1 source lookup + 1 scoring query + 1 `findMany` for the sampled cards + `2N` per-card lookups inside `getModelCardQuery.toResponse` (interaction counts + likedByMe). For `N=6` that's 14 round-trips. Acceptable, but the easiest win if we ever blow the budget is denormalizing interaction counts onto `Model` (already on the roadmap per [[model-statistics-plan]]).
- No cache for MVP. Revisit when p95 > 50ms on the recommendations route specifically.

## 12. Open questions

- **Exclude viewer-authored models?** Probably yes — "you might also like *your own model*" is awkward. Confirm with product before adding `AND NOT EXISTS (... ModelAuthor where userId = $2)`.
- **Recency boost.** Should newer-than-source candidates get a small score bump? Defer pending UX call.
- **Exclude already-liked models?** Defer. Adds one more EXISTS subquery — cheap, but a UX choice.
- **"More by this author" facet.** Separate surface, not blended into recommendations. Out of scope.
- **`SAMPLING_EXPONENT` as env var?** No — hardcode at `1.5` for MVP. Revisit when product wants to A/B it.
- **Expose per-item score in the response?** Production: no. Consider an admin-only debug flag if recommendation quality issues surface.
- **K=30 vs adaptive K.** If `limit` is bumped to 24 the pool is only 6 items wider than the result — sampling barely randomizes anything. Consider `K = max(30, limit * 5)` if 24 ends up being a common request. Not urgent.

## 13. Out of scope

- Frontend (card placement, carousel, loading states, empty state).
- Caching or materialized recommendations.
- Personalization based on viewer history (would need a viewer-features layer).
- Cross-resource recommendations (recommending users, tags).
- Multi-armed-bandit click-feedback loop.
- Replacing `buildModelWhere` with `accessibleModelsWhere` — owned by [[permission-unification-plan]].

## 14. Cross-links

- [[permission-unification-plan]] — owns the visibility predicate that this query temporarily inlines; the SQL block in §4 has the swap-point clearly marked.
- [[legacy-migration-search-spec]] — both surfaces eventually share FTS infrastructure. The trigram index on `ModelVersion.title` introduced here is the first piece of that infrastructure; that spec should pick it up rather than re-introducing it.
- [[model-fork-plan]] — the family-proximity signal becomes more valuable once the fork graph is populated by the legacy import.
- [[model-statistics-plan]] — when interaction/like counters get denormalized onto `Model`, the popularity subquery in §4 collapses to a column read.
