# Frontend security audit — apps/modeling-commons-frontend

Findings are listed roughly by severity. Items that turned out to be intentional or out-of-scope (e.g. the `frame-ancestors: ["*"]` override on `/models/**/embed`, which is needed for the embed use case) are not listed.

## sanitizeUrl reads `window.location.origin` and crashes on SSR
**Severity:** high
**Location:** `app/utils/sanitize.ts:13`
**Description:** `sanitizeUrl` calls `new URL(trimmed, window.location.origin)`. `window` is undefined during SSR, so any component that renders this on the server throws and bails out of SSR. `SocialLink.vue` calls it directly in its template — every profile page that shows social links has a hydration / SSR-crash hazard if the user has links saved.
**Workarounds:**
- Option A — Replace the base with `useRequestURL().origin` (Nuxt-safe, works on both sides).
- Option B — Hard-code the base to a stable origin from runtime config and resolve relative URLs against it.
- Option C — Skip the absolute-URL branch on the server (return `trimmed` if `import.meta.server`).
**Recommended:** Option A — `useRequestURL()` is already Nuxt's blessed pattern for this and avoids hard-coding the origin or skipping validation on SSR.

## `nuxt-security` is disabled outside production
**Severity:** medium
**Location:** `nuxt.config.ts:34-36`
**Description:** `security.enabled = process.env.NODE_ENV === "production"`. CSP, X-Frame-Options, Permissions-Policy and friends only fire in `production`. Anyone running the staging/preview build with `NODE_ENV=development` (which is the default for `nuxt dev`/`nuxt preview` in many setups) ships an app with no header-level XSS or clickjacking defenses.
**Workarounds:**
- Option A — Drop the `enabled` flag entirely so headers are applied in every environment.
- Option B — Flip the default to `enabled: true` and explicitly disable in tests via a per-script env var.
**Recommended:** Option A — there's no good reason to ever serve this app without nuxt-security's defaults, and removing the flag prevents an environment-variable typo from disabling all protections.

## `csurf` block does nothing — there is no CSRF protection wired up
**Severity:** medium
**Location:** `nuxt.config.ts:166-168`
**Description:** The config declares a `csurf` key, but no `nuxt-csurf` module is in `modules`, and `nuxt-security`'s built-in `security.csrf` slot isn't used either. The block reads like CSRF protection exists; it doesn't. Cross-origin requests are gated only by the backend's same-site cookie settings. (Also flagged in `misconfiguration-audit.md`; included here because of the security implication.)
**Workarounds:**
- Option A — Install `nuxt-csurf` and add it to `modules`, then keep the existing `csurf` block.
- Option B — Move CSRF onto `nuxt-security`'s `csrf` setting; delete the standalone `csurf` block.
- Option C — Document explicitly that CSRF is the backend's responsibility via SameSite=Strict cookies and remove the misleading config block.
**Recommended:** Option B — keeps everything under one security module instead of pulling in another.

## `SocialLink` opens user-controlled URLs in `_blank` without `rel`
**Severity:** medium
**Location:** `app/components/shared/SocialLink.vue:2-4`
**Description:** `<a :href="sanitizeUrl(url)" target="_blank">` is missing `rel="noopener noreferrer"`. The URL comes from user-saved social links (website type accepts any HTTPS URL), so opening it can expose `window.opener` and the referrer. `embed.vue` does this correctly with `rel="noopener"`; SocialLink does not.
**Workarounds:**
- Option A — Add `rel="noopener noreferrer"` directly to the `<a>` tag.
- Option B — Use `<NuxtLink ... external target="_blank" rel="noopener noreferrer">` so Nuxt's link rules apply.
**Recommended:** Option A — single-line fix, matches the convention already used in `embed.vue`.

## `runtimeConfig.public.adminDashboardUrl` leaks an admin URL to the client bundle
**Severity:** medium
**Location:** `nuxt.config.ts:18`
**Description:** The admin dashboard URL is shipped to every client (it's in `runtimeConfig.public`). Discoverability of the admin entry point assists attackers performing a credential-stuffing or zero-day scan. It also signals that an admin surface is reachable.
**Workarounds:**
- Option A — Move it to `runtimeConfig` (server-only) and surface it to admin pages via a server route.
- Option B — Keep it public but gate the value behind a feature flag so non-admin users never receive it (still client-visible).
- Option C — Make the admin dashboard unguessable (random subdomain) and accept the disclosure.
**Recommended:** Option A — admins access this via authenticated server routes; non-admins should never see the URL.

## `runtimeConfig.public.*` read from non-`NUXT_PUBLIC_*` env vars (build-time bake-in)
**Severity:** medium
**Location:** `nuxt.config.ts:18-19`
**Description:** `adminDashboardUrl` reads `ADMIN_DASHBOARD_URL`; `storageBaseUrl` reads `NUXT_STORAGE_BASE_URL`. Nuxt only auto-overrides `runtimeConfig.public.X` at runtime if the env var is named `NUXT_PUBLIC_X`. As written, these two values are baked into the build artifact and cannot be rotated without a rebuild. From a security standpoint that matters because storage base URLs and admin URLs are exactly the kind of value an ops team needs to change in response to an incident without redeploying.
**Workarounds:**
- Option A — Rename the env vars to `NUXT_PUBLIC_ADMIN_DASHBOARD_URL` / `NUXT_PUBLIC_STORAGE_BASE_URL` and update `.env.example`/deploy config.
- Option B — Keep names but explicitly read them at request-time inside a Nitro plugin and inject into `useState`.
**Recommended:** Option A — matches the Nuxt convention and is a 3-line change.

## `image.domains` allowlist breaks because of the same env-var mismatch
**Severity:** low (security side-effect)
**Location:** `nuxt.config.ts:135-141`
**Description:** `image.domains` is built from `NUXT_PUBLIC_STORAGE_BASE_URL` etc. — these env vars aren't set anywhere in the repo (`.env.example` defines `NUXT_STORAGE_BASE_URL` without the `PUBLIC_`). Result: the IPX allowlist is effectively empty, which forces `@nuxt/image` into pass-through mode and disables host-allowlisting for remote-image fetches. With no allowlist, the IPX proxy will rewrite any URL the user supplies through `<NuxtImg>`, including arbitrary external hosts.
**Workarounds:**
- Option A — Fix the env-var names so the allowlist actually populates (see previous finding).
- Option B — Disable the `ipx` provider for untrusted URLs and use a static `unoptimized` mode where the URL comes from user content.
**Recommended:** Option A — paired with the previous finding, this is a single rename.

## SSR cookie forwarding is correct but not asserted by a regression test
**Severity:** low
**Location:** `app/composables/api/useApi.ts:14-21`, `app/plugins/auth.ts:60-99`
**Description:** Both `useApi()` (SSR branch) and the auth plugin forward the incoming request's `cookie` header to the backend, which is necessary for session resolution but means the SSR fetch is making credentialed requests on behalf of the user. The current implementation is correct — but there is no test asserting that an SSR client built without an incoming cookie does not silently impersonate a previous user (singleton hazard). A regression here would be invisible in normal QA. (See the CLAUDE.md note "SSR: a fresh client is created per call".)
**Workarounds:**
- Option A — Add an SSR test that asserts two consecutive `useApi()` calls with different cookies produce two distinct clients with different `cookie` headers.
- Option B — Document the invariant in a JSDoc on `makeServerClient` so future refactors don't introduce a module-level cache.
**Recommended:** Option A — already aligned with the test-coverage push in this branch.
