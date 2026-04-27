# Testing

## Overview
Tests should cover the test pyramid: unit tests, service tests, and end-to-end tests.

1. Write tests with different granularity
2. The more high-level you get the fewer tests you should have
3. Unit tests should be fast and test small pieces of logic in isolation. Service tests should test the integration of multiple components or services. End-to-end tests should test the entire application flow from the user's perspective.
4. Use test doubles (mocks, stubs, fakes) to isolate the unit under test and control its dependencies.
5. Aim for high code coverage, but prioritize meaningful tests that cover critical paths and edge cases over achieving 100% coverage.
6. Tests should focus on invariants and expected behavior rather than implementation details and exact outputs, to allow for refactoring without breaking tests.


## Architecture Context
This app has three tiers:

- **Browser** (Vue 3 + Nuxt client)
- **Nitro BFF** (Nuxt's server): auth forwarding, SSR data loading, request shaping
- **Fastify backend** (separate repo): owns business logic and the database

**Scope of this document**: Nuxt-side testing only. Fastify has its own test suite covering backend logic and DB integration. From this doc's perspective, Fastify is a real, running dependency — not something we mock or test.

## Testing Tools
1. **Vitest**: read `./VITEST.md` for details and links to exact docs pages.
2. **Playwright Core**: read `./PLAYWRIGHT-CORE.md` for details and links to exact docs pages.
3. **@nuxt/test-utils**: read `./NUXT-TEST-UTILS.md` for details.
4. **@vue/test-utils**: Vue component mounting and interaction. Used together with `@nuxt/test-utils`'s `mountSuspended` for Nuxt-aware component tests.

---

### 1. Unit Tests
**Scope**: Pure functions, composables (no Nuxt context), utilities, Pinia store logic, type guards.

**Tools**: Vitest only.

**API policy**: Fully mocked. Unit tests never touch the network or a database. Use `vi.mock()` at the module boundary for `$fetch`, `useFetch`, repositories, etc.

**Location**: Colocated as `*.test.ts` next to the source file.

**Example targets**:
- `utils/formatCurrency.ts` → `utils/formatCurrency.test.ts`
- `composables/usePagination.ts` → pure logic only; anything Nuxt-aware moves to component/service tier

**Speed budget**: Whole suite under ~10s. Individual tests sub-millisecond.

### 2. Component Tests
**Scope**: Vue components in isolation — props, emits, slots, rendered DOM, user interaction.

**Tools**: Vitest + `@vue/test-utils` + `@nuxt/test-utils` (`mountSuspended`, `renderSuspended`).

**API policy**: Mock `useFetch`/`$fetch` at the component level. Components don't know whether data comes from BFF or Fastify and shouldn't care.

**Location**: Colocated as `Component.test.ts` next to `Component.vue`.

### 3. BFF Service Tests (Nitro)
**Scope**: Nitro server routes — auth forwarding, header rewriting, error mapping, SSR-side data composition, anything the BFF does beyond raw proxying.

**Tools**: Vitest + `@nuxt/test-utils` (`setup({ server: true })`) + `$fetch` from `@nuxt/test-utils/e2e`.

**API policy**: Mock the Fastify upstream via MSW or a stubbed `ofetch` instance pointed at a local handler. We don't run Fastify for this tier — Fastify's own test suite covers its behavior, and pulling it in here just slows feedback and couples tests to backend availability.

If a BFF route is a pure pass-through (no transformation, no auth logic, no aggregation), don't test it here — it's covered by E2E.

**Location**: `tests/bff/` in the Nuxt repo.

### 4. End-to-End Tests
**Scope**: Critical user journeys through the full stack — browser → Nitro → Fastify → DB.

**Tools**: Vitest + `@nuxt/test-utils` (`setup({ server: true, browser: true })`) + `playwright-core`. Fastify and its dependencies (DB, Redis, etc.) come from docker-compose.

**API & DB policy**: Real Nitro, real Fastify, real DB — all from the CI-managed compose stack. External services (Stripe, S3, OAuth) are faked inside Fastify per its own conventions; the Nuxt suite doesn't know or care.

**Local dev**: `docker-compose up` the backend stack, then `pnpm test:e2e`. The test setup reads the Fastify URL from env (e.g., `NUXT_PUBLIC_API_BASE`).

**Example targets** (keep this list short — E2E is expensive):
- Sign up → log in → land on dashboard
- Core domain workflow (one or two paths)
- Checkout with faked Stripe
- Smoke test per critical page (loads, renders, no console errors)

**Do not test in E2E**: form validation messages, individual component states, error handling for every field. Push those down to component or BFF tests.

**Speed budget**: Single-digit minutes. Don't run on every commit if it pushes past that.

---

## What to Mock vs. What's Real

| Layer | Nitro BFF | Fastify | DB | Browser |
|-------|-----------|---------|----|---------|
| Unit | Mocked | Mocked | None | None |
| Component | Mocked (`$fetch`) | N/A | None | happy-dom |
| BFF service | **Real (Nitro)** | Mocked (MSW) | None | None |
| E2E | **Real** | **Real (docker)** | **Real (test DB)** | **Real (Chromium)** |

---
