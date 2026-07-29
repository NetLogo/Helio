# schema-2 — Notification tables and event retry columns

**Goal** — Land the `UserNotification` and `UserNotificationPreference` tables, the `Event`
retry columns, and their repositories, with no behavior change anywhere.

## In scope

- `prisma/schema.prisma`: two new models; `attempts` / `lastError` on `Event`; back-relations
  on `Event` and `User`.
- The migration, plus the regenerated `generated/prisma` client (it is committed).
- `src/modules/user-notification/database/user-notification.{record,repository,repository.port,repository.mock}.ts`
- `src/modules/user-notification/database/notification-preference.{record,repository,repository.port,repository.mock}.ts`
- `src/modules/user-notification/index.ts` with the `Dependencies` augmentation for both repositories.
- `src/modules/event/database/event.repository.{ts,port.ts,mock.ts}`: add `markFailed`, extend
  `EventRecord`, add the `attempts` ceiling to `findUnprocessed`.
- `src/modules/event/database/event.repository.port.ts`: add `model.created`,
  `model.version.created`, `model.version.updated` to `KnownEvents`.

## Out of scope

- Any service, route, DTO, domain, or worker change. Nothing calls the new repositories yet.
- `markFailed` being wired into the processor — that is `dispatch-4`.
- Reconciling the `model_version.created` vs `model.version.created` naming split. Both stay.

## Description

Schema as specified in `doc/notification-pipeline-plan.md` under "Schema". Two points that
matter for review:

- `UserNotification` carries `@@unique([eventId, recipientId, category])`. This is the
  idempotency key the whole pipeline rests on — a redelivered event hits the constraint instead
  of sending a second email.
- `UserNotificationPreference` rows are **sparse overrides**. Absence means "use the catalog
  default", so there is no backfill and adding a category later needs no data change.

`title` / `body` / `url` / `readAt` and `@@index([recipientId, readAt, createdAt])` on
`UserNotification` serve the in-app feed, which is out of scope for this task. They are included
now so the feed is a pure read-layer addition rather than another migration.

`findUnprocessed` gains `attempts: { lt: <max> }`. The max is passed in as an argument here; it
becomes `rules.limits.notification.maxEventAttempts` in `dispatch-4`.

The three `KnownEvents` additions are a correctness fix in passing: `model-draft.service.ts:558`
and `:660` emit `model.created`, `model.version.created`, and `model.version.updated`, none of
which are in the union today.

## Acceptance criteria

- `yarn run db:migrate:dev` applies cleanly against a fresh database (`yarn run db:reset` then migrate).
- `yarn run db:generate` produces a client that is committed alongside the migration.
- `yarn run check` (`check-types` + `deps:validate`) passes.
- Both new mocks are the `{ [K in keyof Port]: ReturnType<typeof vi.fn> }` mapped type used by
  `src/modules/model/database/model.repository.mock.ts`, so a port method with no mock entry is
  a type error.
- `yarn run test:unit` and `yarn run test:e2e` pass unchanged — no existing spec should need editing.
- Inserting two `UserNotification` rows with the same `(eventId, recipientId, category)` raises
  a unique-constraint error.

## Depends on

none

## Notes

Migration directory naming: the repo mixes real `prisma migrate dev` timestamps
(`20260506184907_library_model_flag`) with hand-authored `…000000` ones
(`20260720000000_add_model_comment`). Either is fine; prefer the generated timestamp.

Two repositories in one module directory is consistent with existing practice —
`model-comment` handles both comments and comment likes through one repository, and splitting
these two keeps each port small.

The `Event` → `UserNotification` relation is `onDelete: Cascade`. Events are never deleted today,
so this is defensive rather than load-bearing.
