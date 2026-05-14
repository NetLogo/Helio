# Fork Graph UI Plan

Companion to backend `legacy-migration-fork-graph-plan.md`. The backend returns JSON nodes + edges; the frontend renders.

## Backend surface

```
GET /v1/models/:modelId/fork-graph?ancestors=N&descendants=M
→ { rootId, nodes: [{ id, name, isDeleted, isRoot }], edges: [{ from, to }] }
```

Defaults `ancestors=10`, `descendants=2`. Hard caps at 50 each. Edges point parent → child. Deleted nodes have `isDeleted: true` and `name = "[deleted model]"`.

## Where it lives

`ModelFamilyTab.vue` already exists as a stub in `components/model/detail/`. Two paths:

1. **Replace the stub** with the new graph view.
2. Keep the existing parent/child mini-card view as the default and put the full graph behind a toggle ("Show fork graph").

**Recommendation:** replace. The mini-card view is value-light once a real graph exists, and keeping both bloats the tab.

## Library

`@vue-flow/core` (and `@vue-flow/controls` for the zoom/pan UI, `@vue-flow/background` for the dot grid). Reasoning over Cytoscape / D3:

- Vue 3-native, declarative `<VueFlow :nodes :edges />` API.
- Built-in pan/zoom, minimap, controls. We don't reinvent.
- Bundle ~80KB gzipped including controls — well below the cytoscape/d3 alternatives.
- Easy to style with Tailwind classes on custom node components.

Layout: pre-compute a vertical-tree layout (`dagre` or `elkjs`) server-side responses are small enough that doing it client-side per render is fine. Use `dagre` (smaller, simpler) unless we observe layout glitches on wide fans.

## Components

Under `components/model-detail/fork-graph/`:

- `ForkGraph.vue` — top-level. Owns the fetch, the layout pass, depth controls, and the vue-flow canvas. Lives in `ModelFamilyTab.vue`'s body.
- `ForkGraphControls.vue` — a small `UCard` overlay with two sliders / numeric inputs for `ancestors` (0–50) and `descendants` (0–50), plus a `Reset to defaults` button. Debounced refetch on change.
- `ForkGraphNode.vue` — custom vue-flow node template:
  - Normal: model name (truncate at ~30 chars), small "Open" link icon. Hover → tooltip with fuller name. Click → `navigateTo('/models/' + node.id)`.
  - Root: outlined ring, `(You are here)` caption underneath.
  - Deleted: muted background, italic `[deleted]` label, no click affordance (the node has no usable id from the user's perspective).
- `ForkGraphEmpty.vue` — single-node states (root has no parents and no children). Shows the root node centered with a short caption explaining the model is a standalone with no forks yet.

## Composable

`useModelForkGraph(modelId, { ancestors, descendants })`:

- `useAsyncData` keyed `fork-graph-${modelId}-${ancestors}-${descendants}` so depth changes refetch automatically.
- Returns `{ nodes, edges, loading, error }`. The composable layers in the layout pass (`computed`) so the page receives already-positioned nodes ready for vue-flow.
- A simple `Map<id, {x, y}>` produced by `dagre` keyed by node id, merged into vue-flow node objects before render.

## UX details

- **Default depth:** match backend defaults (10 ancestors, 2 descendants). For viral models this still gives a useful local picture.
- **Click behavior:** clicking a non-root, non-deleted node navigates to that model. Holding ⌘/Ctrl opens in a new tab. Deleted nodes are not clickable.
- **Tooltip on hover:** name + a small "model id: abc123…" snippet. Useful for debugging shared links, low cost.
- **Layout reflow:** when the user bumps depth and new nodes arrive, animate position changes (vue-flow handles this with `fitView` + transitions).
- **Mobile:** vue-flow is pan/zoom-friendly out of the box. On small viewports default to descendants=1 to keep the initial render legible; user can expand.

## Empty / boundary states

- **No parents, no children:** render a single-node "no forks" empty state. Don't bother with the canvas chrome.
- **Truncation:** when the backend's hard cap (50) clips a longer chain, surface a small "Showing first 50 ancestors. See in full?" banner. There's no "full" endpoint yet — link this question to backend follow-up. For MVP, just say "Truncated — depth capped at 50".
- **All ancestors private and leaked-by-name** (per backend open question): no UI affordance needed; names appear as-is. If the backend ever switches to `"[private model]"` placeholders, render them muted like deleted nodes (no click).

## Edge cases

- **Cycle in data:** shouldn't happen (parent immutable) but backend has a dedupe pass. Frontend trusts the response.
- **Race on slider drag:** the debounced refetch (300ms after last change) means rapid drags don't hammer the server. `useAsyncData`'s built-in dedupe takes care of overlapping requests.
- **Caller can't read root model:** the `resolveModel('read')` hook 403s; the page catches this upstream (we never enter the tab if the model isn't readable, since `ModelDetail` itself would 403). So this case shouldn't surface to the graph.

## Performance

- A 50/50 depth on a viral model could still return ~hundreds of nodes after dedupe. vue-flow handles low thousands of nodes fine.
- If we observe layout costs in the wild, push `dagre` into a web worker. Not worth the complexity upfront.
- No caching beyond `useAsyncData`'s in-flight dedupe. The backend open-question notes a possible cache; if/when the endpoint shows up as slow, the UI doesn't need to change.

## Out of scope

- PNG export. Backend dropped it entirely; client-side export via `dom-to-image` is trivial to add later if a user asks.
- Version numbers on nodes (legacy didn't surface them either; the backend response doesn't include them).
- Cross-model lineage search ("show me where this model was forked to N hops out") — same data, different default depths; defer.

## Open questions

- **Replace vs. toggle for the existing `ModelFamilyTab` mini-card view** — see [Where it lives](#where-it-lives). Recommend replace.
- **Tooltip content** — id snippet for debug is cheap; user-friendly tooltips might prefer author + visibility + last-update. Defer until we see usage data.
- **Layout library** — `dagre` for MVP. Switch to `elkjs` only if wide fans look ugly.

## Reuse checklist

- `useAsyncData` with composite key.
- `utils/navigator.ts` / `navigateTo` for in-app routing.
- `components/shared/Empty.vue` — single-node empty state shell.
- `components/shared/Loader.vue` — initial fetch state.
- Toast on error via `useToast()`.
