# dispatch-4 — Event dispatch to the notification service

**Goal** — Wire the event processor to a dispatcher that fans durable events out to the
notification service, with preference gating and ledger idempotency.

## In scope

- `src/modules/user-notification/domain/user-notification.types.ts` — add `NotificationIntent`,
  `NotificationRecipient`, `NotificationLinks`, `Notifier`, `EventSubscriber`.
- `src/modules/user-notification/user-notification.service.ts` — `handles` + `handleEvent`.
- `src/modules/user-notification/user-notification.service.ts` — build `NotificationLinks`:
  `unsubscribeUrl` is `` `mailto:${env.product.supportEmail}` `` (today's behaviour, unchanged),
  `preferencesUrl` is `${env.product.website}/settings/notifications`.
- `src/modules/event/event-dispatcher.service.ts`
- `src/workers/event-processor.ts` — call `dispatch`, record `markFailed` on throw.
- `src/workers/index.ts` — thread `eventDispatcherService` through.
- `src/config/rules.ts` — `limits.notification`: `eventBatchSize: 50`, `maxEventAttempts: 5`,
  `previewLength: 280`.
- `src/server/di/index.ts` — add `notifier` to the first glob; delete the second glob.
- `.dependency-cruiser.cjs` — add `'\\.notifier\\.ts$'` to `applicationLayerPaths`.

## Out of scope

- Any actual notifier. `notifiers` is an empty array in this PR, so `handles` returns false for
  everything and dispatch is a no-op end to end.
- Touching `model-comment.service.ts`. The inline send keeps working until `comment-notifier-5`.
- A ledger sweeper for rows with a null `emailSentAt`.

## Description

`eventDispatcherService` holds an explicit subscriber array — `[userNotificationService]` —
filters by `handles(event.type)`, runs the survivors under `Promise.allSettled` so one failure
cannot block another, logs each rejection, and rethrows an `AggregateError` if any failed so the
processor records the attempt.

`userNotificationService.handleEvent` resolves intents from its notifiers, then per intent:

1. Load the recipient; skip if missing, soft-deleted, banned, or without an email — no ledger
   row for someone who could never receive it.
2. Resolve the preference; skip the email channel on `email: false`, skip the ledger row on
   `inApp: false`.
3. Insert the ledger row inside `transactionManager.run`. A unique violation on
   `(eventId, recipientId, category)` means an earlier pass already delivered this — skip.
4. Invoke `intent.buildEmail(recipient, links)` and send.
5. Stamp `emailSentAt` on success; on failure log and leave it null.

`buildEmail` is a thunk rather than a rendered email so nothing is rendered for a recipient who
opted out. `links` is passed in rather than built by each notifier so that the deferred
unsubscribe-token work changes one file instead of every notifier — see "Unsubscribe: deferred"
in `doc/notification-pipeline-plan.md`. Its values are constants for now.

The processor changes from unconditional `markProcessed` to:

```ts
try { await eventDispatcherService.dispatch(event); await eventRepository.markProcessed(event.id); }
catch (error) { await eventRepository.markFailed(event.id, error); }
```

so a failed event stays unprocessed and is retried on the next tick until `attempts` reaches
`maxEventAttempts`.

The second `loadModules` call in `src/server/di/index.ts` (lines 33-44) is deleted rather than
extended. It globs `*.{handler,event-handler}`, matches zero files, and its `asyncInit: 'init'`
resolver option fires inside Fastify's `onReady` hook — which runs *after* `startWorkers` at
`src/server/index.ts:82`. Anything that self-registered there would race the worker it registers
with. Notifiers go in the first glob as plain singletons instead.

## Acceptance criteria

- The processor calls `dispatch` once per fetched event, then `markProcessed` on success.
- A subscriber that throws produces `markFailed` with `attempts` incremented and `lastError`
  populated, and does not abort the remaining events in the batch.
- An event whose `attempts` has reached `maxEventAttempts` is not returned by `findUnprocessed`.
- Two subscribers, one throwing: the other still runs to completion.
- `handleEvent` with a recipient who has `email: false` for the category sends no mail.
- `handleEvent` on an event whose ledger row already exists sends no mail and does not throw.
- `buildEmail` is never invoked for an intent filtered out by preferences or recipient state.
- A `sendMail` rejection leaves `emailSentAt` null, is logged, and does not throw out of
  `handleEvent`.
- `yarn run check` passes, including `deps:validate` with the new `applicationLayerPaths` entry.
- `yarn run test:unit` and `yarn run test:e2e` pass; existing `workers.feature` still goes green.

## Depends on

`mail-await-1.md`, `preferences-3.md`

## Notes

Nothing is observable to a user after this PR. That is intentional — every seam is unit-tested
in isolation before the cutover in `comment-notifier-5` gives it real traffic.

The subscriber array is explicit rather than discovered by container enumeration. With one
subscriber, enumeration would be indirection without payoff; adding the FTS indexer from
`[[legacy-migration-search-spec]]` later is one line.

`userNotificationService` will resolve notifiers by *name* from the awilix cradle in the next
PR, so there is no static import edge from `user-notification` to any producing module. Keep it
that way — the `Notifier` type is imported by producers, never the reverse.

`previewLength: 280` in `rules.ts` is unused until `comment-notifier-5` consumes it; it is added
here to keep all three constants in one commit.
