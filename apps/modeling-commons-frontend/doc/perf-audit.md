# Frontend perf / render-loop audit — apps/modeling-commons-frontend

Findings focus on watchers / reactive cycles, missing cleanup, and DOM-reconciliation hazards. Style-level micro-opts (`shallowRef`, `markRaw`) are omitted unless they have a real cost.

## `useApiPagination` watch on `fetchedPage` runs `immediate: true` and appends to `data`
**Severity:** high
**Location:** `app/composables/api/useApiPagination.ts:60-71`
**Description:** The watcher does `data.value = [...data.value, ...next.data]` and is set up with `immediate: true`. On SSR-then-hydration, `fetchedPage` is already populated (SSR pre-fetch) and the watcher fires once on the server *and* once on hydration — duplicating the first page in the visible list. The same risk applies if the key changes and `_setStaleKey/_clearStaleKey` race the watcher.
**Workarounds:**
- Option A — Drop `immediate: true` and rely on the natural `useAsyncData` reactivity (SSR-hydrated value is already in `fetchedPage.value`; you can seed `data` from it once on setup).
- Option B — Track the last-applied page number on the watcher and skip if `next.page === lastApplied`.
- Option C — Replace the append-on-watch pattern with a computed that reduces over a `Map<page, results>`.
**Recommended:** Option C — pages are addressable by index, and a `Map`-backed view eliminates the entire class of "did this fire twice?" bugs that this composable invites.

## `useModels` post-mount watcher means SSR rows never make it into `rows`
**Severity:** medium
**Location:** `app/composables/model/useModels.ts:40-50`
**Description:** `rows` is seeded at composable creation with `data.value?.rows ?? []`. The watcher that keeps `rows` in sync with `data` is wrapped in `onMounted` — so on the server, the SSR-rendered list comes only from the seed (often `[]` before `useAsyncData` resolves), and on the client, the watcher only registers after hydration. If the same `useModels` is re-used and `data` updates *during* hydration (between SSR seed and first `onMounted`), that update is dropped. The list is "right" most of the time only because filters change post-mount; the SSR-empty first paint is paid in user-perceived latency.
**Workarounds:**
- Option A — Drop the `onMounted` wrap and `watch(data, …)` from setup.
- Option B — Replace `rows` with `computed(() => data.value?.rows ?? [])` and accumulate via a separate page-keyed Map.
**Recommended:** Option B — eliminates the ref/watcher pair entirely; the page-keyed Map handles the "load more, append" case without the SSR-vs-mount race.

## `useModelDraftForm` watches arrays composed inline — re-evaluated every reactive tick
**Severity:** low
**Location:** `app/composables/model/useModelDraftForm.ts:235-245`
**Description:** The watcher source is `() => [...(formState.value.tags ?? []), ...(formState.value.subjects ?? []), ...(formState.value.usecases ?? [])]`. Vue creates a fresh array on every dependency tick and runs a structural diff against the previous tick to decide whether to invoke the handler. The arrays are small so the cost is small, but the same getter runs for *any* reactive read inside `formState`, so even unrelated edits (title, description) walk the getter.
**Workarounds:**
- Option A — Split into three separate watches (one per array). Each diff is then over a single ref.
- Option B — Wrap the getter in a `computed` and watch the computed.
**Recommended:** Option B — single source of truth, no source-getter re-evaluation noise, easy to debug.

## `useModelDraftForm` watches `formState.value.title` and `.description` and calls `patch` on every keystroke
**Severity:** medium
**Location:** `app/composables/model/useModelDraftForm.ts:219-233`
**Description:** Every character typed in the title or description input triggers `void patch({ title: v })`. `patch` is debounced inside `useModelDraft`, so network calls are coalesced — but the watcher itself runs N times per second and the debounce timer is reset on each keystroke, which can starve a slow typist out of ever flushing. There is also no flush on blur.
**Workarounds:**
- Option A — Debounce the *watcher* with a leading edge of "fire after N idle ms", not the network call.
- Option B — Replace the per-field watchers with a single `useDebouncedRef` shared with the input.
- Option C — Flush on blur in addition to debounce-tail.
**Recommended:** Option C as a quick fix paired with Option A — guarantees flush on blur and avoids the indefinite-typist starvation.

## `pages/models/index.vue` keyword debounce never clears on unmount
**Severity:** low
**Location:** `app/pages/models/index.vue:229-235`
**Description:** `let keywordTimeout: ReturnType<typeof setTimeout>` plus a `setTimeout` that calls `setFilter(...)` runs on every keystroke. There is no `onBeforeUnmount(() => clearTimeout(keywordTimeout))`. Navigating away mid-typing leaves a pending timer that fires `setFilter` on a torn-down page; it doesn't leak the *page* (refs are dead) but it does schedule a no-op handler. Compare `pages/(auth)/verify-email.vue`, which correctly clears its interval on unmount.
**Workarounds:**
- Option A — Add `onBeforeUnmount(() => clearTimeout(keywordTimeout))`.
- Option B — Replace the manual debounce with VueUse's `useDebounceFn` (auto-cleans on scope dispose).
**Recommended:** Option B — one fewer manual lifecycle hook, harder to get wrong.

## Index used as `:key` in lists that can re-order
**Severity:** low
**Location:** `app/components/model/ModelAuthors.vue:6,29`; `app/components/user/UserHeader.vue:16`; `app/components/shared/SocialLinksInput.vue:96`
**Description:** Index-as-key forces Vue to reuse DOM nodes positionally; on a reorder, Vue mutates each node in place rather than moving the matching node. For lists this small the cost is negligible — flagged because reorders also cause subtle hydration mismatches (covered in the hydration audit). Same fix.
**Workarounds:**
- Option A — Key by stable item ID (e.g. `author.userId`).
**Recommended:** Option A.

## `useState("device-name", …)` reads UA on server, rewrites in `onMounted`
**Severity:** low
**Location:** `app/composables/auth/useDeviceName.ts:9-11`
**Description:** Not a render loop, but the `onMounted` rewrite causes a second tick of any reactive consumer immediately after hydration — every `<UInput placeholder="…">` or label that reads `deviceName.value` re-renders post-mount even when SSR already had the value. (Also flagged in `hydration-audit.md`.)
**Workarounds:**
- Option A — Trust the SSR-derived value; drop the onMounted overwrite.
**Recommended:** Option A.
