# Modeling Commons Frontend — Nuxt Misconfiguration Audit

Scope: `nuxt.config.ts`, plugin/middleware wiring, env conventions, route extensions.
Date: 2026-05-20

## `csurf` config block is a no-op (no module loaded)

**Severity:** high
**Location:** `nuxt.config.ts:166-168`
**Description:** `csurf: { https: ... }` is set at the top level, but neither `nuxt-csurf` is in `modules` nor is `nuxt-security`'s `security.csrf` option used. `nuxt-security` only installs `nuxt-csurf` when `securityOptions.csrf` is provided (see `node_modules/nuxt-security/dist/module.mjs:116`). The current key is unrecognized, so there is no CSRF protection wired up despite the appearance of one.
**Workarounds:**
- Option A — Move the option under `security.csrf` so `nuxt-security` installs `nuxt-csurf` automatically. Tradeoff: tied to `security.enabled` (currently production-only).
- Option B — Add `nuxt-csurf` to `modules` and keep the top-level `csurf` key. Tradeoff: extra module to maintain; runs in dev too.
- Option C — Remove the block if CSRF is enforced by the backend (Better Auth) and the frontend is a pure SPA over fetch with `SameSite` cookies. Tradeoff: must verify the backend covers all state-changing routes.
**Recommended:** Option A — keeps configuration co-located with the rest of `nuxt-security`, and the production-only gate is acceptable since the dev origin already isn't a CSRF target.

## `image.domains` reads a non-existent env var (`NUXT_PUBLIC_STORAGE_BASE_URL`)

**Severity:** high
**Location:** `nuxt.config.ts:135-141`
**Description:** `image.domains` includes `process.env.NUXT_PUBLIC_STORAGE_BASE_URL`, but `.env`/`.env.example` only define `NUXT_STORAGE_BASE_URL` (not `NUXT_PUBLIC_*`). The filter then drops the `undefined`, so storage URLs are not in the allowlist — `<NuxtImg>` requests pointed at the storage host will be rejected by IPX and fall back to the original URL with no optimization.
**Workarounds:**
- Option A — Read `process.env.NUXT_STORAGE_BASE_URL` here to match the actual env name.
- Option B — Rename the env var to `NUXT_PUBLIC_STORAGE_BASE_URL` everywhere (env files, infra, code) so it follows Nuxt's public-runtime convention.
**Recommended:** Option B — also fixes the related runtime-config issue below; image domains then derive from the runtime config (`runtimeConfig.public.storageBaseUrl`) instead of a duplicate `process.env` read at build time.

## Runtime-config keys can't actually be overridden at runtime

**Severity:** high
**Location:** `nuxt.config.ts:13-24`
**Description:** Several `runtimeConfig.public.*` values are read at *build* time from env vars that don't follow the `NUXT_PUBLIC_*` convention (`NUXT_STORAGE_BASE_URL` → `storageBaseUrl`, `ADMIN_DASHBOARD_URL` → `adminDashboardUrl`). Nuxt's runtime override only fires when the env var matches the path-derived name (`NUXT_PUBLIC_STORAGE_BASE_URL`, `NUXT_PUBLIC_ADMIN_DASHBOARD_URL`). As written, the values are baked into the build and changing them in the deployed container has no effect, defeating the purpose of `runtimeConfig`.
**Workarounds:**
- Option A — Rename env vars to `NUXT_PUBLIC_STORAGE_BASE_URL` and `NUXT_PUBLIC_ADMIN_DASHBOARD_URL`; drop the explicit `process.env` reads (Nuxt auto-binds).
- Option B — Keep current env names and accept that these are compile-time constants. Document that the docker image must be rebuilt to change them.
**Recommended:** Option A — restores runtime configurability and removes redundant code.

## `@nuxt/test-utils/module` is loaded in production `modules`

**Severity:** medium
**Location:** `nuxt.config.ts:29`
**Description:** `@nuxt/test-utils/module` is listed unconditionally in `modules`, but the package is only in `devDependencies`. The Dockerfile happens to install dev deps before `nuxt build` so it doesn't crash, but the module registers test-only routes/handlers (e.g. `/__test`) and adds dev-only behavior into the production server output. It also makes `--production` installs (or any deploy that prunes dev deps before build) fail with a missing-module error.
**Workarounds:**
- Option A — Gate the entry: `...(process.env.NODE_ENV !== "production" ? ["@nuxt/test-utils/module"] : [])`.
- Option B — Move `@nuxt/test-utils` to `dependencies` and accept that production ships test infra.
- Option C — Configure `@nuxt/test-utils` from `vitest.config.ts` only and remove it from `modules` entirely (most tests already use `@nuxt/test-utils` via vitest, not the Nuxt module).
**Recommended:** Option C — the test helpers don't need to be a Nuxt module unless you're using `@nuxt/test-utils` runtime endpoints in dev/CI; if you are, fall back to Option A.

## `nitro.prerender: false` is the wrong shape

**Severity:** medium
**Location:** `nuxt.config.ts:172-176`
**Description:** Nitro's `prerender` option is an object, not a boolean. Setting `false` is silently ignored, so the base config from `@repo/nuxt-core` still applies (`crawlLinks: true` by default). Combined with `routeRules` marking `/privacy`, `/about`, `/donate`, etc. as `prerender: true`, the prerenderer may crawl from those into more of the app than intended during `nuxt build`.
**Workarounds:**
- Option A — Use `nitro.prerender: { crawlLinks: false, routes: [] }` to explicitly disable crawling while still honoring `routeRules`.
- Option B — Remove the `nitro.prerender: false` line and rely on the base config; keep the `routeRules` prerender markers.
**Recommended:** Option A — makes the intent explicit and prevents accidental crawls of dynamic content (e.g., model pages) that aren't prerender-safe.

## `turnstile.enabled` is a build-time string, not a runtime boolean

**Severity:** medium
**Location:** `nuxt.config.ts:38-41`
**Description:** `turnstile.enabled: process.env.CAPTCHA_SITE_KEY` assigns the raw string (or `undefined`) to a field that the module treats as boolean. Because it's at the top level (not under `runtimeConfig`), the truthiness check is baked at build time and can't be toggled at runtime by env. If the build runs without `CAPTCHA_SITE_KEY` set, Turnstile is permanently disabled in that artifact even if the production env later provides one.
**Workarounds:**
- Option A — Coerce explicitly: `enabled: Boolean(process.env.CAPTCHA_SITE_KEY)`, and document that builds must have `CAPTCHA_SITE_KEY` set.
- Option B — Move site key under `runtimeConfig.public.turnstile.siteKey` and drop `enabled` (let the module enable itself when a site key is present at runtime; check the module's actual behavior).
**Recommended:** Option A — minimal change, makes intent explicit; revisit Option B only if you need runtime toggling.

## Duplicate `pages:extend` routes alias the same component to multiple names

**Severity:** low
**Location:** `nuxt.config.ts:58-95`
**Description:** Five `pages.push(...)` calls map `~/pages/models/[id]/index.vue` to three distinct route names (`model-slug`, `model-slug-version`, `model-version`) plus the default `models-id`. Each registration creates a separate route record sharing the same component, which is fine for matching but makes name-based navigation (`router.push({ name: "..." })`) ambiguous and inflates the route table. The `embed` and `edit` variants also duplicate routes that file-based routing would already produce, the only addition being the `:slug` segment.
**Workarounds:**
- Option A — Use a single registration per page with an optional slug param (e.g. `/models/:id{/:slug}?` once Vue Router 4 path syntax is verified).
- Option B — Keep the duplication but use a stable canonical name and treat slug variants as URL-only aliases (drop the alternate `name`s).
- Option C — Leave as-is and ensure the codebase only navigates by path (not by route name).
**Recommended:** Option B — assign one canonical `name` (matching the file-based one) and drop the alternate names; reduces a Nuxt-router footgun without redesigning the URL scheme.

## `linkChecker: { enabled: false }` overrides production link checking unconditionally

**Severity:** low
**Location:** `nuxt.config.ts:170`
**Description:** The base `@repo/nuxt-core` config conditionally enables `nuxt-link-checker` for production builds (gated by `NUXT_BUILD_LINK_CHECKER`). The frontend disables it unconditionally, so the safety net the base config provides for catching broken internal links in CI is silently off for this app.
**Workarounds:**
- Option A — Remove the override and rely on `NUXT_BUILD_LINK_CHECKER=0` in environments where it's not wanted.
- Option B — Keep the override but document why this app opts out (e.g., expected dynamic links that always fail).
**Recommended:** Option A — keeps the base config's CI safety net; flip the env var per-environment instead.

---

Out of scope / verified clean:
- `runtimeConfig.turnstile.secretKey` is correctly server-only (not under `public`).
- `routeRules` `xFrameOptions: false` / `frame-ancestors: ["*"]` for `/models/**/embed` are intentional and correctly wired through `nuxt-security`.
- Middleware (`auth`, `guest`, global `onboarding`) is auto-loaded from `app/middleware/` and registered via `definePageMeta` on the right pages.
- All file paths referenced in `hooks.pages:extend` exist on disk (`pages/models/[id]/index.vue`, `embed.vue`, `edit.vue`, `users/[id]/index.vue`).
- The `(auth)/passkey.client.vue` page registers as `/passkey` (verified in `.nuxt/dev/index.mjs`).
