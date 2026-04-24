Nuxt 3 frontend for Modeling Commons. TypeScript, Vue 3 `<script setup>`, Nuxt UI, openapi-fetch typed client.

## Rules
- Use `yarn` only.
- No relative `../../` imports across `app/`. Use `~/…` (app) and `~~/…` (repo root, e.g. `~~/shared/types/api`).
- Don't start the dev server.
- Avoid decorative comments. Write self-explanatory code; comment only when the *why* isn't obvious.

## Layout (`app/`)

- `pages/` — file-based routing. Custom routes added via `nuxt.config.ts` `hooks.pages:extend` (see `/models/:slug/:id` mapping).
- `components/` — Vue SFCs, auto-imported. Feature-scoped subdirs (e.g. `components/model-detail/`, `components/upload/`).
- `composables/` — auto-imported. One concern per file, default-export a function named `useX`.
- `plugins/` — Nuxt plugins. `api.ts` initializes the openapi-fetch client.
- `layouts/`, `middleware/`, `stores/`, `utils/`, `assets/` — standard Nuxt conventions.
- `shared/types/api.d.ts` — **generated** from the backend OpenAPI spec (see below). Never edit by hand.

## API client

- `useApi()` returns a typed `openapi-fetch` `Client<paths>`.
  - Browser: singleton initialized by `plugins/api.ts`.
  - **SSR: a fresh client is created per call and forwards the incoming request's `cookie` header** so the backend can resolve the session. Don't "optimize" this into a module-level singleton — session cookies are per-request.
- Typed calls: `api.GET("/api/v1/models/{id}/card", { params: { path: { id } } })`.
- For routes not yet in `shared/types/api.d.ts` (e.g. just added on backend), fall back to raw `fetch(apiBase + path, { credentials: "include" })` — see `composables/useModelInteractions.ts` — and migrate to `api.METHOD(...)` after regenerating types.
- Regenerate types by running `yarn generate:types` in `apps/modeling-commons-backend` (boots the server, dumps OpenAPI, writes `shared/types/api.d.ts` via `CLIENT_TYPES_OUTPUT_DIR`).

## Data fetching

- Read endpoints: wrap in a `useAsyncData` composable with a stable key, e.g. `useModelCard(modelId)`. Watch refs in the input so navigation refetches.
- Derive response types from the client: `type X = ResponseSuccessData<"GET", "/api/v1/...">` — `ResponseSuccessData` is a global helper.
- Mutations: plain `async` functions on a composable, call via `await` from event handlers. Don't use `useAsyncData` for writes.

## UI conventions

- Nuxt UI primitives (`UButton`, `UCard`, `UIcon`, `UAlert`, etc.). Icons via `i-lucide-*`.
- Toasts via `useToast()`.
- For optimistic mutations (likes, follows, etc.), update local reactive state first, roll back on failure, and gate rapid re-entry with a `busy` ref.

## State sourced from props

When a parent passes server data and the child mutates a derived view of it (e.g. `ModelDetail` local `stats` seeded from `card.stats`):
- Seed a `reactive({...})` from a `computed` initial snapshot.
- `watch` the computed and `Object.assign` on change so a refreshed card resets local state.
- Mutate the local reactive object for optimistic updates — don't mutate props.

## Typing around stale generated types

`shared/types/api.d.ts` can lag behind the backend. If the server returns a field the client types don't know about yet, use a narrow local cast (`props.card as unknown as { stats?: Partial<CardStats> }`) rather than `any`, and drop the cast after regenerating types.

## Dev servers

Don't start them.
