# tests/

See `doc/test/PLAN.md` for the inventory and `doc/test/TESTING-OVERVIEW.md` for tier policy.

## Layout

- `helpers/` — shared mock factories, fixture builders, runtime-config installer. `import { ... } from "@/tests/helpers"` (or relative).
- `fixtures/` — static asset fixtures used by component / e2e tests (e.g. sample `.nlogo`, preview images).
- `bff/` — Nitro server-route tests (deferred; populated when server routes exist).
- `e2e/` — full-stack journeys, real Fastify required.
- `nuxt/` — Nuxt-aware tests that don't fit beside source (rare; only when colocation isn't appropriate).

Unit tests for utils and component tests for SFCs are **colocated** next to the source — `Foo.test.ts` lives next to `Foo.ts` / `Foo.vue`. The Vitest config picks them up via the `unit` and `components` projects.

## Running

```sh
yarn test                # unit + components (fast suites)
yarn test:all            # all projects (including e2e — needs Fastify)
yarn test:watch
yarn test:unit
yarn test:components
yarn test:e2e            # requires NUXT_PUBLIC_API_BASE pointing at running Fastify
```

## E2E target modes

- Default: Vitest builds Nuxt and launches a fresh server. Fastify must be reachable at `NUXT_PUBLIC_API_BASE`.
- Against an already-running app: `E2E_HOST=http://localhost:3005 yarn test:e2e` — `tests/e2e/setup.ts` switches to host mode.

CI must `npx playwright install chromium` once per runner — `playwright-core` doesn't bundle browsers.
