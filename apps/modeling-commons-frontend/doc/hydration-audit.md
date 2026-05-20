# Frontend hydration audit — apps/modeling-commons-frontend

Findings cover places where the server render and the client render can diverge, places where the server crash-bails into a client-only render, and `useState` initializers whose result differs between SSR and client.

## `sanitizeUrl` references `window` on the server
**Severity:** high
**Location:** `app/utils/sanitize.ts:13`
**Description:** `new URL(trimmed, window.location.origin)` throws under SSR (`window` is undefined). Any template that calls `sanitizeUrl` during server render bails out of SSR for that subtree; the client then has to re-render from scratch. `SocialLink.vue` calls this directly in its template, so every page that lists user social links is affected.
**Workarounds:**
- Option A — Pass `useRequestURL().origin` as the base (works on both sides).
- Option B — Short-circuit the absolute-URL branch on the server with `if (import.meta.server) return trimmed;`.
**Recommended:** Option A — preserves URL validation on both sides instead of skipping it during SSR.

## `useDeviceName` initializes from UA on server, then overwrites on mount
**Severity:** medium
**Location:** `app/composables/auth/useDeviceName.ts:1-14`
**Description:** `useState("device-name", ...)` returns one value on the server (parsed from the request `user-agent`) and then `onMounted` rewrites it from `navigator.userAgent`. Any component that prints the device name during render gets a hydration mismatch between server and client, and any component that reads it as a stable identifier flickers right after mount. The two parses usually agree, but proxies/CDNs sometimes rewrite `User-Agent`.
**Workarounds:**
- Option A — Drop the `onMounted` overwrite; the SSR-derived value is fine.
- Option B — Wrap consumers in `<ClientOnly>` and stop seeding from the request header.
**Recommended:** Option A — the SSR value is already correct in normal flows and removing the overwrite eliminates the post-mount flicker.

## `usePasskeyPrompt` reads `localStorage` value into state that affects rendering
**Severity:** medium
**Location:** `app/composables/auth/usePasskeyPrompt.ts:5-30,48`
**Description:** `dismissed` starts at `false` on the server; `onMounted` calls `syncDismissalState` which reads `localStorage` and may set it to `true`. Any component rendering the prompt visibility from `shouldSkipPrompt` will render "not dismissed" during SSR then flip to "dismissed" after hydration. The author tried to guard against this with `isClientReady`, but the gate is only applied via `isReady`, not everywhere `dismissed` is used.
**Workarounds:**
- Option A — Make the prompt itself a `<ClientOnly>` boundary (only render the prompt after mount).
- Option B — Initialize via `useState` keyed to a user-scoped cookie so the value is consistent on both sides.
**Recommended:** Option A — the passkey prompt is non-critical UI, ClientOnly is the cheap correct fix.

## `useWebsite` is a shared composable on the client but per-call on the server
**Severity:** low
**Location:** `app/composables/shared/useWebsite.ts:27`
**Description:** `import.meta.client ? createSharedComposable(_useWebsite) : _useWebsite`. The server returns a fresh `ref` per call, the client returns a singleton ref. Most call sites just read fields, but anyone who mutates `useWebsite()` from a single component (rare, but possible) gets per-server-render isolation and cross-component sync on the client. This is invisible until a feature relies on the singleton semantics.
**Workarounds:**
- Option A — Wrap with `createSharedComposable` unconditionally — the data is build-time constant, no SSR per-request isolation needed.
- Option B — Drop the helper and inline the `useRuntimeConfig().public.website` read.
**Recommended:** Option B — there's no state to share, just static config; the indirection mostly buys a hydration mismatch.

## `ModelDetail.handleShare` reads `window.location.href` without an SSR guard
**Severity:** low
**Location:** `app/components/model/detail/ModelDetail.vue:258-263`
**Description:** The author already guards with `typeof window !== "undefined"`, but the same function then calls `navigator.share` and `navigator.clipboard` without checking; the `typeof` guard only protects the URL. This is a click handler, so it can't fire during SSR — flagged only because the partial guard misleads future readers about whether the guard is needed at all. The function is correctly client-only at runtime; the half-guard is a code-smell, not a real divergence.
**Workarounds:**
- Option A — Drop the `typeof window` check (the handler can only run on the client).
- Option B — Wrap the whole function in `if (import.meta.client)` for clarity.
**Recommended:** Option A — handler context already makes this safe; the guard adds confusion.

## `ModelAuthors`, `UserHeader`, `SocialLinksInput` use index as `:key`
**Severity:** low
**Location:** `app/components/model/ModelAuthors.vue:6,29`; `app/components/user/UserHeader.vue:16`; `app/components/shared/SocialLinksInput.vue:96`
**Description:** Each iterates a stable list keyed by `index`. The lists themselves change (reordering author list, removing a social link) and there's no DOM-identity preserved across reorders. On hydration after a server-side reorder (rare; possible if the backend response order changes between SSR pre-fetch and client re-fetch), Vue would reuse the wrong DOM node. Not currently causing visible issues; flagged because the rule "don't use index as key when items can reorder" is the kind of latent landmine the task asks for.
**Workarounds:**
- Option A — Key by `author.userId` / `link.rawValue + link.type` (already stable IDs available on the items).
- Option B — Keep index-as-key and add a comment explaining why reordering is impossible.
**Recommended:** Option A — the stable IDs are already on the items, switching is a one-line change.
