RESTful API backend: Fastify + TypeScript, Prisma/PostgreSQL, better-auth, adminjs, OpenAPI/Swagger/Scalar, Typebox. DDD architecture.

## Rules
- Only use `yarn` for package management, never `npm` or `pnpm`.
- Follow the module layout and dependency rules strictly. Check with `yarn run deps:validate`.
- Write unit tests for domain logic and services. Write integration tests for features.
- If something breaks, capture it in a test first, then fix the code. No untested hotfixes.

## Module layout (`src/modules/<module>/`)

Every module follows the same skeleton - mirror it when adding a new one:

- `domain/` - aggregates, value types, domain errors, pure logic (`<module>.domain.ts`, `<module>.errors.ts`, `<module>.types.ts`).
- `database/` - always three files: `<module>.repository.ts` (Prisma impl), `.repository.port.ts` (interface), `.repository.mock.ts` (for tests). Record shapes live here too (`<module>.record.ts`).
- `dtos/` - Typebox request/response schemas + inferred types. Paginated responses have their own `*.paginated.response.dto.ts`.
- `queries/` - read-side CQRS-like handlers for complex queries (`get-*.query.ts`, `list-*.query.ts`).
- `patches/` - write-side CQRS-like handlers for complex mutations (`fork-*.patch.ts`, `publish-*.patch.ts`).
- `<module>.service.ts` - write-side commands; orchestrates domain + repository + events.
- `<module>.route.ts` - Fastify routes; pulls deps from `fastify.diContainer.cradle` and calls service methods.
- `<module>.mapper.ts` - record ↔ domain ↔ response.
- `index.ts` - awilix registrations for the module.

Reference modules: `src/modules/model/` (full shape), `src/modules/event/` (read-only admin), `src/modules/file/` (S3 integration).

## Writes (Database mutations)

- Always go through `transactionManager.run(async (ctx) => { ... })`.
- Use `repository.insertTx(ctx, entity)` / `updateFields(ctx, ...)` / `softDelete(ctx, ...)` inside the txn.
- Emit domain audit via `eventRepository.insert(ctx, { type, actorId, resourceType, resourceId, payload })` in the same txn. Event types are dotted (`model.created`, `model.deleted`).
- Soft delete, don't hard delete: models/users carry `deletedAt`. Call `modelDomain.assertNotDeleted(entity)` before mutating.

## Routes

- Auth: `preHandler: [requireAuth]` from `#src/shared/hooks/require-auth.ts`.
- Authorization on a model: `resolveModel('read' | 'write' | 'admin')` from `#src/shared/hooks/resolve-model.ts`.
- Admin-only: `[requireAuth, requireRole('admin')]`.
- All routes versioned under `/v1/...`.
- Use Typebox schemas for `body` / `params` / `querystring` / `response`. For querystring-heavy routes.
- Use `fastify.withTypeProvider<TypeBoxTypeProvider>().route({ ... })`.
- Return shapes: `201 { id }` on create (see `idDtoSchema`), `204` on update/delete, full DTO on read.

## Imports

Use path aliases, never relative `../../`:

- `#src/...` - app source
- `#prisma/index` - generated Prisma client (output is `generated/prisma`, not `@prisma/client`)

## Client/request context

- Trusted IP comes from `env.server.ipAddressHeaders` (ordered header list), then `req.ip`. See `src/server/plugins/rate-limit.ts` for the precedence pattern - reuse it, don't reimplement.
- Never store raw IPs. Hash with a rotating salt if you need uniqueness (PII / GDPR).

## Comments

- Write self-explanatory code. No decorative comments.
- A comment earns its place only when the *why* isn't in the code (non-obvious constraint, workaround, surprising invariant).

## Dev servers

Don't start them.

## Decisions

Update this file with brief notes if needed.
