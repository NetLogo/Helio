Nuxt 3 frontend for Modeling Commons. TypeScript, Vue 3 `<script setup>`, Nuxt UI, openapi-fetch typed client.

## Rules
- Use `yarn` only.
- No relative `../../` imports across `app/`. Use `~/…` (app) and `~~/…` (repo root, e.g. `~~/shared/types/api`).
- Don't start the dev server.
- Avoid decorative comments. Write self-explanatory code; comment only when the *why* isn't obvious.
- Make use of subagents to separate concerns.
- After big features, ask user for feedback then run `claude-md-management:revise-claude-md ` to update this doc with any new conventions or patterns that emerged during implementation.

## Layout (`app/`)

- `pages/` — file-based routing. Custom routes added via `nuxt.config.ts` `hooks.pages:extend` (see `/models/:slug/:id` mapping).
- `components/` — Vue SFCs, auto-imported. Feature-scoped subdirs (e.g. `components/model-detail/`, `components/upload/`).
- `composables/` — auto-imported. One concern per file, default-export a function named `useX`.
- `features/<feature>/` — data code per domain (`auth`, `models`, `drafts`, `users`, `tags`, `netlogo-versions`, `health`, `notifications`, `notification-preferences`, `notification-unsubscribe`, `comments`). See "Features" below. There is no `app/forms`; form validators, rules and labels live in their feature.
- `plugins/` — Nuxt plugins. `api.ts` initializes the openapi-fetch client.
- `layouts/`, `middleware/`, `stores/`, `utils/`, `assets/` — standard Nuxt conventions.
- `data/` — data shared across features (e.g. `countries.ts`). Not auto-imported. Feature strings go in the feature's `literals.ts`.
- `shared/types/api.d.ts` — **generated** from the backend OpenAPI spec (see below). Never edit by hand.

## API client

- `useApi()` returns a typed `openapi-fetch` `Client<paths>`.
  - Browser: singleton initialized by `plugins/api.ts`.
  - **SSR: a fresh client is created per call and forwards the incoming request's `cookie` header** so the backend can resolve the session. Don't "optimize" this into a module-level singleton — session cookies are per-request.
- Typed calls: `api.GET("/api/v1/models/{id}/card", { params: { path: { id } } })`.
- Query params go under `params: { query }`, e.g. `api.GET("/api/v1/me/notifications", { params: { query } })`. A top-level `query` option type-checks but openapi-fetch silently drops it.
- For routes not yet in `shared/types/api.d.ts` (e.g. just added on backend), regenerate the types (`yarn generate:types` in the backend) and use the typed client. No raw `fetch`.
- Regenerate types by running `yarn generate:types` in `apps/modeling-commons-backend` (boots the server, dumps OpenAPI, writes `shared/types/api.d.ts` via `CLIENT_TYPES_OUTPUT_DIR`).

## Features

- Every API call lives in `app/features/<feature>/api.ts`. Feature names follow the domain.
- Files, created only when they have content:
  - `api.ts`: fetch and mutation functions over the typed `useApi()` client.
  - `types.ts`: types derived from `ResponseSuccessData`, `RequestBody` and the generated api types. No hand-written copies of API shapes.
  - `mappers.ts`: API response to what components render, and other pure shape conversions (e.g. draft to form state).
  - `validators.ts`: zod schemas for the feature's forms and query params, plus types inferred from them.
  - `rules.ts`: feature settings and limits, e.g. `modelRules.pageLimit`. Rules the backend also enforces (password and name limits, comment content) come from `@repo/modeling-commons-shared` instead.
  - `errors.ts`: feature errors, with messages read from the `literals.ts` beside it.
  - `literals.ts`: one `as const` object of the feature's source strings, e.g. `notificationLiterals`. Spread its arrays (`[...authLiterals.logInFields]`) where a prop wants a mutable array.
  - `__tests__/`: unit tests for the feature's pure files (validators, mappers). Files tested there import their siblings explicitly, since the `unit` project has no auto-imports.
- `features/**` is in `imports.dirs` (`nuxt.config.ts`), so functions, types and literals are global; call sites need no import line. Unimport injects an import only where a name is used, so a page's literals stay in that page's chunk. Keep one literals object per feature; no barrel file and no app-wide aggregate.
- Each function calls `useApi()` inside its body, never at module level, so SSR builds one client per request.
- Global type names must not shadow DOM globals: the notification row type is `UserNotification`, not `Notification`.
- Components and composables stay in `app/components` and `app/composables`; composables wrap the feature functions with reactive state (`useAsyncData`, optimistic updates, toasts).

## Data fetching

- Read endpoints: wrap the feature's fetch function in a `useAsyncData` composable with a stable key, e.g. `useModelCard(modelId)` over `fetchModelCard`. Watch refs in the input so navigation refetches.
- Derive response types in the feature's `types.ts`: `type X = ResponseSuccessData<"GET", "/api/v1/...">` — `ResponseSuccessData` is a global helper.
- Mutations: functions in the feature's `api.ts`, exposed by a composable and called via `await` from event handlers. Don't use `useAsyncData` for writes.
- Live updates: `useStreamTopic(topic, onChange)` holds a `StreamTopic` (`@repo/modeling-commons-shared`) on the tab's one stream (`useServerStreamConnection`, `features/server-stream/`) and swaps it when the topic changes. `onChange` gets the topic's events, `"live"` once each subscription request succeeds and `"resync"`; it calls the read's existing refresh. A topic type must first exist in the shared package.

## URL-synced filters (useModels pattern)

Adding a new filter to a search page (e.g. `pages/models/index.vue`) requires three coordinated edits:
1. Register the key in the composable's `queryFilters` array (drives `readQueryParams`).
2. Add the field to the zod `querySchema` so it survives `.parse(...)` before the API call.
3. In the page, two watchers: `filters.value.X` → selected ref (`immediate: true` to hydrate from URL), and selected ref → `setFilter("X", value)`.

## UI conventions

- Nuxt UI primitives (`UButton`, `UCard`, `UIcon`, `UAlert`, etc.). Icons via `i-lucide-*`.
- Toasts via `useToast()`.
- Source UI strings (labels, headings, empty states) live in the feature's `literals.ts`, e.g. `notificationLiterals` in `features/notifications/literals.ts`. Computed strings are built in `app/utils`. Data shared across features stays in `app/data`.
- For optimistic mutations (likes, follows, etc.), update local reactive state first, roll back on failure, and gate rapid re-entry with a `busy` ref.

## State sourced from props

When a parent passes server data and the child mutates a derived view of it (e.g. `ModelDetail` local `stats` seeded from `card.stats`):
- Seed a `reactive({...})` from a `computed` initial snapshot.
- `watch` the computed and `Object.assign` on change so a refreshed card resets local state.
- Mutate the local reactive object for optimistic updates — don't mutate props.

## Typing around stale generated types

`shared/types/api.d.ts` can lag behind the backend. If the server returns a field the client types don't know about yet, use a narrow local cast (`props.card as unknown as { stats?: Partial<CardStats> }`) rather than `any`, and drop the cast after regenerating types.

## Testing

- Component tests live in `app/components/<area>/__tests__/` and tests for `app/utils` live in `app/utils/__tests__/`; both import through `~/` aliases.
- Tests for feature api functions live in `tests/nuxt/features/` and mock `useApi` the same way as composable tests.
- Upload/edit interaction logic lives in `tests/nuxt/composables/*` (`vitest --project=nuxt`) with `useApi` mocked via `tests/helpers/mockApi` (`makeApiClientMock`/`apiResult`). Mounting the editor stepper in component tests requires replacing `UStepper` via `mockComponent` with a flat slot renderer; mounting the real one hits a recursive-update flake under `@nuxt/test-utils`.
- Request-shape tests (query params, paths, bodies) run a real openapi-fetch client over a recording `fetch` (`makeRecordingApi` in `tests/helpers/notifications.ts`) and assert the recorded URL, not the mocked client's call arguments.
- Full journeys go in `tests/e2e` (real backend + Chromium): they need the backend + Mailpit running and use `signUpAndVerify` for a verified session.

## Dev servers

Don't start them.
