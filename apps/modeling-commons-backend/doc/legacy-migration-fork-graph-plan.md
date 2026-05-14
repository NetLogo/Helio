# Legacy Migration: Fork Graph

Migrate the legacy `GraphController#graphviz` action (which shells out to `graphviz` via `GraphvizR` and serves a PNG out of `/tmp/`) to a pure JSON endpoint. The frontend takes responsibility for rendering; the backend returns nodes and edges only.

Related: [[legacy-migration-collaborations-plan]], [[legacy-migration-search-spec]].

## Overview

Legacy behavior: render the model's ancestor chain and direct children as a Graphviz PNG. Each request shell-executed `dot` and wrote a timestamp-named PNG into `/tmp`, served with `send_file`. Highlight color and "(You are here)" label were inlined in the rendered image.

New behavior: return the same logical graph as JSON. Caller (browser) renders.

## Schema

No schema changes. The fork link already exists on the model aggregate (`parentModelId`, `parentVersionNumber`) and the reverse relation (`childModels`) is already in use by `getModelChildrenQuery`. The query reuses these — nothing else is needed.

## Endpoint

```
GET /v1/models/:modelId/fork-graph?ancestors=N&descendants=M
```

Defaults: `ancestors=10`, `descendants=2`. Hard cap each at `50`.

Response:

```ts
{
  rootId: string,
  nodes: Array<{ id: string, name: string, isDeleted: boolean, isRoot: boolean }>,
  edges: Array<{ from: string, to: string }>
}
```

- `nodes` includes the root model, every ancestor walked up to `ancestors` hops, and every descendant walked down to `descendants` hops (BFS).
- `edges` always points parent -> child (`from = parentId`, `to = childId`).
- Soft-deleted models (with `deletedAt`) are still emitted with `isDeleted: true` so the tree structure does not break. Their `name` falls back to a placeholder (`"[deleted model]"`) to avoid leaking a private last-known title.

## New files

- `src/modules/model/queries/fork-graph.query.ts` — pure read query handler.
- `src/modules/model/dtos/fork-graph.response.dto.ts` — Typebox schema + inferred response type.
- Route registration appended to `src/modules/model/model.route.ts`.
- DI registration in `src/modules/model/index.ts` (add `forkGraphQuery` to the module's `Dependencies` block, register in the awilix container).

## Query algorithm

Pseudocode for `forkGraphQuery.execute(rootId, { ancestors, descendants }, userId)`:

```
clamp ancestors, descendants to [0, 50]

root = modelRepository.findByIdIncludeDeleted(rootId)
if !root: throw NotFound

nodes = new Map<id, {id, name, isDeleted, isRoot}>
edges = new Set<`${from}->${to}`>
add(root, isRoot=true)

// BFS ancestors (one DB call per level — usually a single row each)
frontier = [root]
for hop in 1..ancestors:
  parentIds = frontier.map(n => n.parentModelId).filter(Boolean)
  if parentIds.empty: break
  parents = modelRepository.findManyByIds(parentIds, { includeDeleted: true })
  for p in parents: add(p); edges.add(`${p.id}->${childOf(p).id}`)
  frontier = parents

// BFS descendants (one DB call per level via `IN`)
frontier = [root]
for hop in 1..descendants:
  parentIds = frontier.map(n => n.id)
  children = modelRepository.findMany({
    where: { parentModelId: { in: parentIds } },     // single round-trip per level
    visibilityFilter: visibilityWhere(userId),       // applied at SQL level
    includeDeleted: true,
  })
  for c in children: add(c); edges.add(`${c.parentModelId}->${c.id}`)
  frontier = children

return { rootId, nodes: [...nodes.values()], edges: [...edges].map(parse) }
```

Notes on the implementation:

- One Prisma round-trip per BFS level, not per node. Use `findMany({ where: { parentModelId: { in: [...] } } })`. Don't N+1.
- The repository surface needs a `findManyByIds(ids, { includeDeleted })` helper and a `findChildrenOfMany(parentIds, { visibility, includeDeleted })` helper. Add both to `model.repository.port.ts` / `.repository.ts` / `.repository.mock.ts`.
- Use a `Map<id, Node>` and a stringified edge set (`from->to`) to dedupe cleanly across levels in case of weird shapes.

## Visibility rules

The graph mixes models authored by many different users. We can't just call `resolveModel('read')` on each — that's quadratic. Instead, apply visibility at the SQL level by reusing the same predicate as `buildModelWhere`:

- **Root model:** caller must satisfy `resolveModel('read')`. If not, return 403. This is the only model whose access we strictly enforce.
- **Descendants:** SQL-level visibility filter — public always, private/unlisted only if the caller is an author or has a granted permission. Hidden descendants are dropped from `nodes` *and* their edges are dropped, *and* we stop walking the subtree beyond them.
- **Ancestors:** include them by `id` + `name` even if private. The relationship "model X is a fork of model Y" is already implied by the model's own data, and we don't traverse Y's subtree, so this leaks only the parent name. See [Open questions](#open-questions).
- **Deleted models (anywhere):** emit with `isDeleted: true` and a placeholder name (`"[deleted model]"`). We do not leak the original title.

## Limits

Why cap at 50 each direction:

- Descendants can fan out quadratically on viral fork chains (NetLogo intro models in particular). 50 hops down with average branching factor 3 already gives ~3^50 worst-case; the BFS dedupes, but the per-level Prisma `IN` query grows unboundedly.
- Ancestors are linear in depth, but legacy data has some pathological chains. 50 is plenty for visualization.
- The frontend's expected use case is "context for this model" — not a complete ancestry/descendancy tree. Anyone needing the full tree should use a dedicated tool.

## Route

```ts
fastify.withTypeProvider<TypeBoxTypeProvider>().route({
  method: 'GET',
  url: '/v1/models/:modelId/fork-graph',
  schema: {
    params: modelIdParamsSchema,
    querystring: forkGraphQuerySchema,    // { ancestors?: int 0..50, descendants?: int 0..50 }
    response: { 200: forkGraphResponseDtoSchema },
    tags: ['Model'],
  },
  preHandler: [resolveModel('read')],
  handler: async (req) =>
    forkGraphQuery.execute(req.params.modelId, req.query, req.user?.id ?? null),
});
```

Pure read endpoint. **No audit event** — reads are not audited elsewhere in the codebase either.

## Tests

Unit: `src/modules/model/queries/fork-graph.query.spec.ts`

- Single node (no parent, no children) -> one node, zero edges, `isRoot: true`.
- Linear ancestor chain (root with `parentModelId = A`, `A.parentModelId = B`, `B.parentModelId = null`) with `ancestors=10` -> three nodes, two edges.
- Wide descendants (root has 4 children) with `descendants=1` -> five nodes, four edges; all edges point root -> child.
- Cap respected: `ancestors=200` -> clamped to 50, deepest ancestor reached is hop 50.
- Deleted ancestor is included as a tombstone (`isDeleted: true`, name = `"[deleted model]"`).
- Deleted descendant: same.
- Visibility filter on descendants: a private fork by another author is omitted from `nodes` and `edges`, and its own subtree is *not* traversed.
- Caller has read on root -> request succeeds. Caller does not -> hook (`resolveModel('read')`) returns 403; not tested at the query level.

Integration: `tests/integration/fork-graph.test.ts`

- Seed: owner Alice with public root, public child by Bob, private child by Carol, soft-deleted grandchild.
- As Alice: sees all three (private child by Carol included, grandchild as tombstone).
- As anonymous: private child by Carol is hidden; grandchild still visible as tombstone under public lineage only.
- Hard cap verified end-to-end with `ancestors=100`.

## Open questions

- **Ancestor visibility:** currently we leak parent model names regardless of visibility. Acceptable? Alternative is to apply the same SQL visibility filter to ancestors and substitute `"[private model]"` for the name when hidden — at the cost of more confusing UX (a name-less node mid-chain). Default for MVP: leak parent names, document.
- **Cycle protection:** data should not have cycles since `parentModelId` is fixed at fork time and never updated. But a defensive check (`if nodes.has(id) skip`) is cheap; we already need the dedupe Map. Recommend keeping it.
- **Caching:** hot models (e.g., the Wolf-Sheep canonical model) could have many descendants and many requests. For MVP, no cache. If the endpoint shows up as slow in observability, cache by `(rootId, ancestors, descendants, userId-or-null)` with a short TTL.
- **Pagination of descendants:** currently we return all descendants up to M hops in a single response. If `descendants=50` over a wide fan-out is too heavy, consider paginating at the BFS-level edges. Not in MVP.

## Out of scope

- Frontend rendering (d3, cytoscape, or whatever the frontend picks).
- PNG export. If needed later, do it client-side.
- `GraphvizR` / `graphviz` shell-out / `/tmp` file management. Killed entirely.
- Showing version numbers in the graph. The legacy graph showed model names only; the new one does too. `parentVersionNumber` is stored on the model but not surfaced here.
