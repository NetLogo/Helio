# Test Suite Plan — modeling-commons-frontend

Companion to `TESTING-OVERVIEW.md`. That doc defines tiers and policy; this one is the concrete inventory of what to write, in what order, and where it lives.

## Tier mapping (recap)

| Tier | Runner | Env | Scope |
|------|--------|-----|-------|
| Unit | Vitest `unit` project | `node` | Pure utils, pure composable logic, type guards |
| Component | Vitest `components` project | `nuxt` (happy-dom) | Vue SFCs in isolation (`mountSuspended`) |
| BFF (Nitro) | Vitest `bff` project | `nuxt` | Nitro server routes — when they exist |
| E2E | Vitest `e2e` project | `nuxt` (browser) | Critical journeys via `playwright-core` against real Fastify |

The Vitest config already declares all four projects (`vitest.config.ts`). No edits needed there yet.

## Phase 0 — Scaffold

Done by the main session, not delegated.

1. Add `msw` to `devDependencies` (BFF tier needs network interception against Fastify upstream).
2. Add npm scripts to `package.json`:
   - `test` → `vitest run`
   - `test:watch` → `vitest`
   - `test:unit` → `vitest run --project unit`
   - `test:components` → `vitest run --project components`
   - `test:bff` → `vitest run --project bff`
   - `test:e2e` → `vitest run --project e2e`
3. Create directory layout:
   - `tests/helpers/` — shared mock factories, render helpers
   - `tests/fixtures/` — sample API payloads (model, model card, draft, user/session)
   - `tests/bff/` — Nitro server route tests
   - `tests/e2e/` — full-stack journeys
   - `tests/nuxt/` — Nuxt-aware tests that don't fit beside source (rare)
4. Helpers to author:
   - `tests/helpers/fixtures.ts` — typed fixture factories built off `ResponseSuccessData<...>`
   - `tests/helpers/mockUser.ts` — `mockUseUser({ isLoggedIn: true })` + signed-out variant; wraps `mockNuxtImport('useUser', ...)`
   - `tests/helpers/mockApi.ts` — helper to stub `useApi()` returning a fake `openapi-fetch` client with `.GET/.POST/.PATCH/.DELETE` jest mocks
   - `tests/helpers/mockNuxtConfig.ts` — `mockNuxtImport('useRuntimeConfig', ...)` returning `{ public: { apiBase, appUrl, authBase, ... } }`
   - `tests/helpers/msw.ts` — MSW server bootstrap for BFF tier (`setupServer`, lifecycle hooks)
5. Add `tests/**/*` to the Nuxt TS context via `nuxt.config.ts` `typescript.tsConfig.include` so aliases resolve in test files.
6. Smoke test: one trivial `app/utils/converters.test.ts` to validate the `unit` project end-to-end before fanning out.

## Phase 1 — Unit tests (colocated `*.test.ts`)

All run in `node` env. **No Nuxt context** — if a util touches `useRuntimeConfig`, either pull the config read into the caller or move the test to the `nuxt` env. Most utils here are pure.

| File | What to cover |
|------|---------------|
| `app/utils/converters.test.ts` | `sizeToBytes` for B/KB/MB/GB and unknown unit fallback |
| `app/utils/formatters.test.ts` | `formatRelativeDate` (each branch via `vi.useFakeTimers`), `formatDate`, `getVisibilityIcon` (each case + default), `getTagColorClass` (deterministic by char code), `pluralize`, `capitalize`, `sentenceCase`, `createModelPath` (slug truncation at 50), `parseModelPath` (valid + invalid), `appendWindowProtocol` (with/without protocol; dev vs prod), `formatCountdown`, `formatBytes` (0, KB, MB boundaries), `getModelVisibilityDisplayInfo`. *Skip* `withApiBase`/`getFileURI`/`getPreviewImageURI` here — they read `useRuntimeConfig` and belong in a Nuxt-env file (`tests/nuxt/formatters-runtime.test.ts`). |
| `app/utils/auth.test.ts` | `getSafeNextPath` (valid path, leading `//` rejected, non-string rejected, fallback), `getEmailVerificationCallbackUrl`, `getResetPasswordRedirectUrl`, `getPasskeyPromptUrl` (encoding) |
| `app/utils/netlogo-web.test.ts` | `getNetlogoWebEmbedUrl`, `getNetlogoWebIframeCode`, `getNetlogoWebMarkdownPreviewCode` (with/without preview image), `readInfoTabFromNlogox` (present/missing) — needs DOM, mark file `// @vitest-environment happy-dom` or move to `tests/nuxt/` |
| `app/utils/navigator.test.ts` | `copyTextToClipboard` happy path (mock `navigator.clipboard.writeText`), fallback path (stub `document.execCommand`), null/empty input rejection — needs DOM env |
| `app/utils/markdown.test.ts` | `getFirstParagraphTextFromMarkdown` end-to-end against a small markdown sample — relies on `#imports`, must run in `nuxt` env → place under `tests/nuxt/` |
| `app/utils/openapi.test.ts` | Type-only file; skip runtime tests, optionally `expectTypeOf` smoke |

### Composables

Composables that are pure (no Nuxt auto-imports) → unit project. Anything that touches `useNuxtApp`, `useRuntimeConfig`, `useState`, `useFetch` runs in the components/nuxt env so auto-imports resolve. Most composables here touch Nuxt — they live in the `components` or `nuxt` project.

| File | Tier | What to cover |
|------|------|---------------|
| `app/composables/useUser.test.ts` | components | Mock `useNuxtApp` to return a fake `$auth.session`. Assert `isLoggedIn` true/false branches and `isLoggedIn` type guard |
| `app/composables/useAuthActions.test.ts` | components | Mock `$auth.client.signIn.email/signUp.email/...`, mock `useRuntimeConfig`. Assert each action passes correct callback/redirect URL built via `utils/auth` |
| `app/composables/useApi.test.ts` | components | Browser path: throws if `initApi` not called, returns singleton afterward. SSR path: covered indirectly — leave a TODO for an SSR-env test |
| `app/composables/useModelDraft.test.ts` | components | `ensureDraft` POSTs once and caches; `patch` debounce — call patch 3x within 500ms, expect single PATCH after `flush`; `uploadPrimaryFile`/`uploadAttachment` POST FormData with correct role; error path surfaces server `message`; `publish` returns `{ id }`; `abandon` DELETEs and clears state. Stub `fetch` globally |
| `app/composables/useModelInteractions.test.ts` | components | `like` POST, `unlike` DELETE, `record('views', n)` POSTs body with `versionNumber`. Stub `fetch`; assert silent failure (catch returns null) |
| `app/composables/useModels.test.ts` | components | List loading + filters / pagination behavior (read source first to confirm contract) |
| `app/composables/useModelCard.test.ts` | components | useAsyncData wrapper — mock `useApi().GET` to return card payload; assert key changes refetch when modelId ref changes |
| `app/composables/useModelVersions.test.ts` | components | Same pattern as card |
| `app/composables/useModelVersionCard.test.ts` | components | Same pattern |
| `app/composables/useModelFamilyCard.test.ts` | components | Same pattern |
| `app/composables/useModelAdditionalFiles.test.ts` | components | Same pattern |
| `app/composables/useProfile.test.ts` | components | Read-only profile fetch |
| `app/composables/useProfileSettings.test.ts` | components | Update flows; optimistic state if any |
| `app/composables/usePasskeys.test.ts` | components | List + add/delete passkey via `$auth.client.passkey.*` |
| `app/composables/usePasskeyPrompt.test.ts` | components | Prompt visibility/dismissal logic |
| `app/composables/usePasskeySupport.test.ts` | components | Feature detection (mock `PublicKeyCredential` global) |
| `app/composables/useWebsite.test.ts` | components | Website metadata composable |

### Middleware

| File | Tier | What to cover |
|------|------|---------------|
| `app/middleware/auth.test.ts` | components | Logged-out user redirected to `/login?next=<fullPath>`; logged-in user passes through. Mock `useUser` + `navigateTo` |
| `app/middleware/guest.test.ts` | components | Logged-in user redirected to `/models`; logged-out user passes through |

### Plugins

| File | Tier | What to cover |
|------|------|---------------|
| `app/plugins/api.test.ts` | components | `initApi` invoked with `apiBase` from runtime config. `useApi()` returns singleton on client |
| `app/plugins/auth.test.ts` | components | Read source first; ensure `$auth` shape matches what composables consume |
| `app/plugins/force-light-mode.test.ts` | components | Light mode forced regardless of system preference |

## Phase 2 — Component tests (colocated `Component.test.ts`)

Run in `components` project (Nuxt env). Use `mountSuspended`. Mock `useApi`, `useUser`, `useRuntimeConfig` via `tests/helpers/*`. Stub `UButton`, `UCard`, etc. only when they get in the way — usually let Nuxt UI render.

### Core components

- `BaseCard.test.ts` — title/description/imageUrl render, `to` prop wires anchor, slots (`badges`, `footer`)
- `ModelCard.test.ts` — renders title / description / preview image; visibility badge maps via `getVisibilityIcon`; relative date emitted; "Untitled Model" fallback
- `ModelCardSkeleton.test.ts` — renders skeleton primitives without props
- `SearchBar.test.ts` — renders input; `meta+k` shortcut focuses input (mock `defineShortcuts`)
- `TagCard.test.ts` / `TagList.test.ts` — chip render + click emits
- `Middot.test.ts` — trivial render
- `CopyButton.test.ts` — clicking calls `copyTextToClipboard`; success → toast; error → toast; busy state gates re-entry
- `FileDropZoneBase.test.ts` — drag/drop emits `files`; rejected types filtered; size cap enforced
- `UStripedTable.test.ts` — rows/cols render, striping classes applied
- `ClientNavbar.test.ts` — anonymous nav vs authed nav (mock useUser); search input present
- `ClientFooter.test.ts` — links render

### Auth

- `auth/AuthPageIntro.test.ts` — slot/prop render

### Model detail

- `model-detail/ModelHeader.test.ts` — renders title, author, version selector; like button toggles optimistically; mock `useModelInteractions`
- `model-detail/ModelStats.test.ts` — counts render via `pluralize`; loading skeleton when no stats
- `model-detail/ModelFilesTab.test.ts` — file rows render; download click calls `recordDownload`
- `model-detail/ModelFamilyTab.test.ts` — family graph render; empty state
- `model-detail/ModelVersionsTab.test.ts` — version list; version switch emits
- `model-detail/ModelDiscussionTab.test.ts` — discussion render or empty
- `model-detail/ModelEmbedButton.test.ts` — generates embed code; copy button works
- `model-detail/ModelPreview.test.ts` — preview image fallback; `recordView` fires once on mount
- `model-detail/FamilyCard.test.ts` — child of family tab

### Upload

- `upload/AddDetailsCard.test.ts` — title/description/tags v-model; required-field validation surfaces
- `upload/FileUploadCard.test.ts` — primary + attachments composition; staged file display
- `upload/FileUploader.test.ts` — accept extensions filter; calls `useModelDraft.uploadAttachment`; surfaces upload error
- `upload/ImageDropZone.test.ts` / `upload/ImageUploader.test.ts` — image-only filter; preview render
- `upload/NetlogoFileUpload.test.ts` — `.nlogo*` extension filter; primary-file replacement flow
- `upload/PeerReviewCard.test.ts` — toggle peer review flag
- `upload/SetPermissionsCard.test.ts` — visibility radio cycles through `public/private/unlisted`; emits change
- `upload/UploadCardTitle.test.ts` — slot render
- `upload/form.test.ts` — form-state helpers if any (read source)

### Profile settings

- `profile-settings/ProfileSettingsCard.test.ts` — wrapper layout
- `profile-settings/ProfileSettingsAccountCard.test.ts` — name/email update; calls `useProfileSettings`
- `profile-settings/ProfileSettingsPasswordCard.test.ts` — current/new validation; submit calls `auth.client.changePassword`
- `profile-settings/ProfileSettingsPasskeysCard.test.ts` — list passkeys; add → mock `usePasskeys.add`; delete confirmation
- `profile-settings/ProfileSettingsPreferencesCard.test.ts` — preference toggles persist via composable

### NetLogo Web

- `netlogo-web/NetlogoWebEmbed.test.ts` — iframe `src` matches `getNetlogoWebEmbedUrl`; size attributes set

## Phase 3 — BFF (Nitro) tests

**Status: deferred.** No `server/` directory exists in this repo today; Nitro is currently a pure pass-through to Fastify via `useApi()`. Per `TESTING-OVERVIEW.md`: pure pass-through routes don't get BFF tests — they're covered by E2E.

When server routes are added (auth header forwarding, SSR composition, BFF aggregations), populate `tests/bff/` using `setup({ server: true })` + MSW pointed at the Fastify upstream URL. The MSW helper in `tests/helpers/msw.ts` will already be in place.

## Phase 4 — E2E (critical journeys)

Run in `e2e` project. Two target modes:

1. **Local default** — `setup({ server: true, browser: true })`: Vitest builds Nuxt and launches Chromium. Fastify must be running locally (the docker-compose stack from the backend repo). Test setup reads `NUXT_PUBLIC_API_BASE` from env.
2. **Against deployed/preview** — `setup({ host: process.env.E2E_HOST, browser: true })`: skip the build, hit a real URL.

CI requirement: `npx playwright install chromium` once per runner.

### Files (`tests/e2e/*.test.ts`)

Keep this list short. Each file is one journey, one `describe`.

1. `auth-signup-login.test.ts` — signup → email-verified callback → land on `/models`; logout; login again
2. `auth-password-reset.test.ts` — request reset → follow token link → set new password → log in
3. `auth-passkey.test.ts` — *skip in CI* (WebAuthn requires virtual authenticator). Document a manual test plan only
4. `models-browse.test.ts` — visit `/models`, search filters narrow list, click card → land on model detail page with header + tabs visible, no console errors
5. `model-detail-tabs.test.ts` — switch between Files / Versions / Family / Discussion tabs; like button toggles and persists across reload
6. `model-upload.test.ts` — logged-in user navigates to `/models/upload`, fills details, uploads `.nlogo` file (test fixture), sets visibility public, publishes → redirected to model detail page; reload shows same model
7. `model-draft-resume.test.ts` — start an upload, leave the page, return to `/profile/drafts`, resume, publish
8. `profile-settings.test.ts` — update display name, change password, sign out
9. `smoke.test.ts` — `await Promise.all([url('/'), url('/about'), url('/donate'), url('/models'), url('/login'), url('/signup')].map(...))` — each returns 200, hydrates, no `console.error`

### E2E helpers

- `tests/e2e/helpers/auth.ts` — `signUpRandomUser(page)`, `signIn(page, email, password)`, `signUpAndVerify(page)` (returns a verified, signed-in, onboarded user by reading the verification email from Mailpit's HTTP API — `MAILPIT_URL`, default `http://localhost:8025` — following the auto-sign-in verification link, then completing onboarding). Uses real Fastify endpoints; cleans up via DB or leaves fixtures (the backend test DB is reset between runs)
- `tests/e2e/helpers/mailpit.ts` — thin wrapper over Mailpit's HTTP API: `waitForMessageTo`, `extractLink`, `clearMessages`
- `tests/e2e/helpers/fixtures.ts` — paths to small `.nlogo` test fixture, sample preview image
- `tests/e2e/setup.ts` — shared `setup({ ... })` config

No backend test endpoint was needed — the real verification flow is exercised end-to-end.

### Rules (mirroring `TESTING-OVERVIEW.md`)

- No form-validation message assertions in E2E — those live in component tests.
- Prefer `getByRole`/`getByLabel`. `data-testid` only when no semantic option fits — flag missing labels back to the source as a follow-up.
- Auto-wait via locators / `waitForURL`. Never `waitForTimeout`.
- Each test creates a fresh browser context.

## Execution order

1. Phase 0 scaffold (this session, sequential).
2. Phase 1 unit + composable tests — fan out to subagents in parallel batches.
3. Phase 2 component tests — fan out to subagents grouped by feature folder.
4. Phase 4 E2E — single agent authoring + verifying against running Fastify.
5. Phase 3 BFF — when server routes exist.

## Status (initial run — 2026-04-27)

| Suite | Files | Active | Todo | Time |
|-------|-------|--------|------|------|
| `yarn test:unit` | 5 | 71 | 0 | ~0.4s |
| `yarn test:components` | 38 | 176 | 28 | ~17s |
| `yarn test:nuxt` | 24 | 61 | 6 | ~25s |
| `yarn test:e2e` | 8 | (authored, requires backend) | — | — |

### Lessons learned (don't relitigate these)

- **Don't put `mockNuxtImport` inside helper functions.** It's a macro — only top-level calls in the test file get expanded. The first iteration of `tests/helpers/runtimeConfig.ts` exposed an `installRuntimeConfigMock()` helper; it was a silent no-op. The helper now only exports the `TEST_RUNTIME_CONFIG` constants and contains a comment warning future authors.
- **Don't replace `useNuxtApp` or `useRuntimeConfig` wholesale via `mockNuxtImport`.** They're core Nuxt internals; replacing them breaks `setupNuxt` (`useRouter().afterEach is not a function`). Use the `(original) => ...` overlay pattern, or just read the real config via `useRuntimeConfig()` inside `beforeEach`. See `tests/nuxt/composables/useUser.test.ts` for the working `Proxy` overlay pattern, and `tests/nuxt/composables/useAuthActions.test.ts` for the "use the real config" pattern.
- **Don't call `ref()` (or any imported binding) inside `vi.hoisted()`.** Hoisted code runs before imports. Use plain `{ value }` holders, or move ref creation to module-top-level outside `hoisted` and use `vi.fn()` placeholders inside.
- **Don't share fork state across the nuxt project.** `vitest.config.ts` pins `pool: 'forks'` with `maxWorkers: 1, minWorkers: 1` — single worker, fresh fork per file. `singleFork: true` was tried first and broke things; that's why this isn't enabled.
- **`useAsyncData`'s default `immediate: true` consumes a `mockResolvedValueOnce` before the test's explicit `await execute()/refresh()` call.** Use `mockResolvedValue` (no `Once`) or set up the mock per-call carefully.
- **The default `useAsyncData` cache is module-global.** `clearNuxtData(key)` in `beforeEach` resets it. The two `it.todo`s in `useProfile`/`useProfileSettings` document a deeper SSR-state issue that `clearNuxtData` alone doesn't fix.

### Documented gaps in source (worth addressing as small follow-up PRs)

These showed up while writing tests — the test was correct but source lacks a seam:

- `ModelHeader.vue` has no like button or version selector (the plan assumed it did — like UI lives in `ModelStats.vue`; version state is owned by `ModelDetail.vue`)
- `ModelStats.vue` doesn't call `useModelInteractions` directly — it emits `toggleLike`; the parent calls the network method
- `ModelPreview.vue`'s template body is fully commented out — it currently does nothing
- `ModelFilesTab.vue` doesn't call `useModelInteractions.recordDownload` — it emits `download` and the parent records
- `NetlogoFileUpload.vue` only accepts `.nlogox` (single extension), not the broader plan list
- `FileUploader.vue` doesn't call `useModelDraft.uploadAttachment` — it emits via v-model only
- `ProfileSettingsPasswordCard.vue` is currently just a "Reset password" link, not a working form
- `ProfileSettingsAccountCard.vue` is read-only ("Name editing is not available in this app yet")
- `UIcon` strips the `i-lucide-*` class from the rendered DOM, so `expect(html).toContain('i-lucide-foo')` is fragile — tests should assert on visible behavior or wrapper/text content instead

### `data-testid`s requested by E2E tests

Each E2E file lists what would help in a top-of-file comment. Aggregated:

- `ClientNavbar.vue`: `data-testid="user-menu"`, `data-testid="sign-out"`
- `ModelDetail.vue` tabs: `role="tab"` or `data-testid="tab-{discussion|files|versions|family}"`
- `upload.vue` / `NetlogoFileUpload.vue`: `data-testid="primary-file-input"`
- `pages/profile/drafts/index.vue`: `data-testid="draft-actions"`, `data-testid="draft-resume"`
- `ProfileSettingsPreferencesCard.vue`: `data-testid="profile-visibility"`

## Open questions / follow-ups

- Coverage threshold: not enforced initially. Add `--coverage` to a CI script later once suite is meaningful.
- Visual regression: out of scope for v1; Playwright `page.screenshot()` can be added to the smoke test if desired.
- Accessibility: not in scope here; an `axe-core` pass on the smoke test would be a cheap add later.
- WebAuthn in E2E: requires `BrowserContext.addInitScript` with a virtual authenticator. Defer.
