# preferences-3 — Notification preferences

**Goal** — Let a signed-in user read and change their notification preferences.

## In scope

- `src/modules/user-notification/domain/user-notification.domain.ts` — category catalog and
  default merge. Pure.
- `src/modules/user-notification/domain/user-notification.types.ts` — `NotificationCategory`
  and the preference-facing types only.
- `src/modules/user-notification/domain/user-notification.errors.ts` — `UnknownCategoryError` (400).
- `src/modules/user-notification/dtos/notification-preference.response.dto.ts` and
  `update-notification-preferences.request.dto.ts`.
- `src/modules/user-notification/queries/get-notification-preferences.query.ts`
- `src/modules/user-notification/user-notification.mapper.ts`
- `src/modules/user-notification/user-notification.route.ts` — the two routes below.
- `tests/api/user-notification.feature` + `.steps.ts`.

## Out of scope

- `NotificationIntent`, `Notifier`, `EventSubscriber` — those types land in `dispatch-4`.
- `user-notification.service.ts`. Preference writes go through the query + repository; the
  service exists only once there is fan-out to orchestrate.
- Sending anything. No `mailService` dependency in this PR.
- **Unsubscribing from an email link.** Deferred to its own plan; see "Unsubscribe: deferred"
  in `doc/notification-pipeline-plan.md`. No token service, no unauthenticated route, no
  `Verification` rows in this PR.
- The frontend `/unsubscribe` and `/profile/preferences` pages.

## Description

Three routes:

| Route | Auth | Behaviour |
|---|---|---|
| `GET /v1/me/notification-preferences` | `requireAuth` | Catalog merged with the caller's overrides: `{ categories: [{ category, label, description, email, inApp }] }` |
| `PATCH /v1/me/notification-preferences` | `requireAuth` | Body `{ preferences: [{ category, email?, inApp? }] }`. Upsert per category, `204`. Unknown category → 400. |

Both require a session. There is no unauthenticated route in this PR.

The catalog is a `const` literal in the domain, keyed by category, holding `label`, `displayName`,
`description`, and `defaults: { email, inApp }`. Three categories this pass:
`comment.on_your_model`, `comment.reply_to_you`, `general.daily_digest`. It is the single source of truth — a stored
row whose category is not in the catalog is ignored on read and rejected on write, so a retired
category cannot silently suppress notifications.

Emails keep the footer link they have today — `` `mailto:${env.product.supportEmail}` `` — so
this PR changes nothing about what a recipient sees. Preferences are enforced from day one by
`dispatch-4`; what is deferred is only the way to reach them without signing in.

Writes go through `transactionManager.run` per the module conventions, even though there is no
second write to pair with — consistency with every other mutation in the codebase.

## Acceptance criteria

- `GET` for a user with no stored rows returns every catalog category with its default values.
- `PATCH { preferences: [{ category: 'comment.on_your_model', email: false }] }` then `GET`
  shows `email: false` for that category and unchanged defaults for the other; `inApp` is
  untouched when omitted.
- `PATCH` with a category absent from the catalog returns 400 and writes nothing.
- Both routes reject an anonymous request with 401.
- A `PATCH` from user A cannot change user B's preferences — the session is the only source of
  the user id, never the request body.
- Unit specs: catalog default merge matrix; unknown-category rejection.
- E2E feature covers both routes plus the anonymous rejection.
- `yarn run check`, `yarn run test:unit`, `yarn run test:e2e` pass.

## Depends on

`schema-2.md`

## Notes

This PR is independently useful and shippable — a user can manage preferences before anything
consumes them. That is deliberate: it keeps `comment-notifier-5` a cutover rather than a
big-bang.

Route paths use `/v1/me/...` rather than `/v1/users/:id/...`. Preferences are only ever
self-scoped; there is no admin surface for editing someone else's.

Preference reads happen in the fan-out hot path in `dispatch-4`, so the repository's
"fetch all overrides for a user" method should return the whole (tiny) set in one query
rather than one query per category.
