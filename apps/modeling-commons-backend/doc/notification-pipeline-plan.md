# Notification pipeline plan

## Framing

Notifications are sent inline today, on the request path, with no durability and no way for a
user to opt out. Three concrete problems, all visible in one file:

1. **Fire-and-forget.** `src/modules/model-comment/model-comment.service.ts:209` does
   `void notifyOnNewComment(entity, parent)` after the transaction commits. Nothing awaits
   it, nothing retries it. If the SMTP host is down for thirty seconds, those notifications
   are gone — no record that they were owed, no way to find out.

2. **The delivery result is unknowable anyway.** `mailService.sendMail`
   (`src/modules/mail/mail.service.ts:6-14`) wraps nodemailer's callback API without
   promisifying it:

   ```ts
   async sendMail(content: Mail.Options) {
     transporter.sendMail(content, (error, info) => {
       if (error) { logger.error(...); } else { logger.info(...); }
     });
   }
   ```

   The `async` function returns as soon as `transporter.sendMail` is *called*. Even the
   `await mailService.sendMail(content)` inside `notifyOnNewComment`'s `Promise.allSettled`
   resolves before SMTP has done anything. The surrounding rejection handling at
   `model-comment.service.ts:147-156` can never fire for a delivery failure.

3. **No opt-out exists.** Every comment email is rendered with an `unsubscribeUrl` — the
   `@repo/emails` `Layout` component renders the footer link only when one is passed — but
   the value is `` `mailto:${env.product.supportEmail}` `` (`model-comment.service.ts:80`),
   above a comment conceding that "a real unsubscribe/preferences endpoint doesn't exist
   yet". A user who wants fewer emails has to write to support and have a human do it.

   This plan fixes the half that matters most — preferences exist and are enforced on every
   send — but deliberately leaves the footer link as `mailto:`. Reaching preferences still
   requires signing in until the deferred unsubscribe plan lands.

Meanwhile the durable path is already built, and unused. `Event` rows are written inside
`transactionManager.run` alongside the domain write (`model-comment.service.ts:198-207`), so
the table is already a correct transactional outbox: the event and the comment commit or roll
back together. `src/workers/event-processor.ts` already polls it every minute via pg-boss.
Its dispatch body is a placeholder:

```ts
for (const event of events) {
  // Future: dispatch side effects based on event.type
  await eventRepository.markProcessed(event.id);
}
```

This plan closes that loop. Events become the delivery trigger; a new `user-notification`
module owns fan-out, preferences, and a delivery ledger; and each producing module keeps
ownership of *what its notifications say*.

Nothing here requires new infrastructure. pg-boss is already a production dependency, the
worker is already started from `src/server/index.ts:82`, and the outbox already has the right
transactional semantics.

## Scope

In scope:

- A `user-notification` module: category catalog, per-user preferences, delivery ledger, send.
- An `eventDispatcherService` in the `event` module: routes an `EventRecord` to subscribers.
- A `Notifier` contract that producing modules implement to own their own wording.
- One notifier: `model-comment`, covering `model_comment.created`. It replaces
  `notifyOnNewComment` with identical recipient semantics.
- Authenticated preference routes.
- Making `mailService.sendMail` actually await delivery.

Out of scope (deliberately):

- **In-app feed read API.** `GET /v1/me/notifications`, unread counts, mark-read. The ledger
  table carries `title` / `body` / `url` / `readAt` precisely so this is a later read-layer
  addition with no schema churn. The `inApp` preference channel is stored and honoured at
  fan-out; only the routes are missing.
- Digest / batching. `mailDomain.createNotificationSummaryEmail` remains defined and unused.
- Notifiers for non-comment events (`model.liked`, `model_author.added`,
  `model_permission.granted`, …). Each is a new file in its own module once the seam exists.
- **One-click unsubscribe from an email link.** Deferred to its own plan; see "Unsubscribe:
  deferred" below for the design work already done. Emails keep today's
  `` `mailto:${env.product.supportEmail}` `` footer link in the meantime.
- The frontend `/unsubscribe` and `/settings/notifications` pages.
- `List-Unsubscribe` / `List-Unsubscribe-Post` headers.
- Removing the dead `src/shared/cqrs/` bus. It is never registered — `CQRSPlugin` is not in
  `src/server/plugins/`, which is the only directory the plugin autoloader scans — and
  `src/server/di/index.ts:12` passes `fastify.eventBus`, which is `undefined` at that point.
  Harmless only because no module injects it. Separate cleanup.

## Architecture

```
model-comment.service.ts ──(event row, in-txn)──► Event table
                                                      │
                        pg-boss cron ─► event-processor.ts
                                                      │
                                      eventDispatcherService.dispatch(event)
                                                      │
                                      userNotificationService.handleEvent(event)
                                                      │
                        ┌─────────────────────────────┼─────────────────────────┐
                        │                             │                         │
              modelCommentNotifier          preferences lookup          delivery ledger
              (owns wording +               (catalog defaults           (unique key =
               template choice)              + user overrides)           idempotency)
                        │                                                       │
                    Intent[] ──────────────────────────────────────────► mailService
```

Three seams, each earning its place:

1. **`eventDispatcherService`** (event module) — routes an event to subscribers and isolates
   their failures from each other. One subscriber today. When the FTS indexer described in
   `[[legacy-migration-search-spec]]` lands, it becomes a second entry in one array.
2. **`userNotificationService`** — owns preferences, the ledger, and sending. It knows
   nothing about comments, models, or any specific event payload.
3. **The `Notifier` contract** — a producing module answers "given this event, who should
   hear about it, and what does the email say?" The wording, the template choice, and the
   recipient rules stay in the module that understands them.

### The wiring detail that makes this work

`userNotificationService` resolves `modelCommentNotifier` **by name** from the awilix cradle:

```ts
export default function makeUserNotificationService({
  modelCommentNotifier,
  notificationPreferenceRepository,
  userNotificationRepository,
  userRepository,
  userNotificationDomain,
  transactionManager,
  mailService,
  logger,
}: Dependencies) {
  const notifiers: Array<Notifier> = [modelCommentNotifier];
  // …
}
```

There is **no static import edge** from `user-notification` to `model-comment`. The type
arrives through the global ambient `Dependencies` interface, which `model-comment/index.ts`
reopens via declaration merging (`src/declarations.d.ts` is where the global is anchored).
dependency-cruiser sees nothing to complain about, and adding a notifier is a one-line change
to the array plus a file in the producing module.

The only real import runs the other way: `model-comment` imports the `Notifier` contract it
fulfils. A producer depending on the contract it implements is the correct direction.

Registration is by filename — `src/server/di/index.ts` autoloads
`modules/**/*.{repository,mapper,service,domain,query,storage}.{js,ts}` as awilix singletons,
naming them with `formatName` (`model-comment.notifier.ts` → `modelCommentNotifier`). This
plan adds `notifier` to that glob.

## The `Notifier` contract

`src/modules/user-notification/domain/user-notification.types.ts`:

```ts
export type NotificationCategory = 'comment.on_your_model' | 'comment.reply_to_you';

export type NotificationRecipient = { id: string; email: string; name: string | null };

export type NotificationLinks = { unsubscribeUrl: string; preferencesUrl: string };

export type NotificationIntent = {
  recipientUserId: string;
  category: NotificationCategory;
  title: string;   // stored on the ledger row; surfaced by a later in-app feed
  body: string;
  url: string;
  buildEmail: (
    recipient: NotificationRecipient,
    links: NotificationLinks,
  ) => Promise<Mail.Options>;
};

export type Notifier = {
  eventTypes: ReadonlyArray<string>;
  resolve: (event: EventRecord) => Promise<Array<NotificationIntent>>;
};

export type EventSubscriber = {
  handles: (eventType: string) => boolean;
  handleEvent: (event: EventRecord) => Promise<void>;
};
```

Three things to call out:

- **`buildEmail` is a thunk, not a rendered email.** The notifier is called before
  preferences are checked; rendering React Email templates for a recipient who has opted out
  would be wasted work. The service invokes the thunk only for intents that survive the
  preference gate.
- **`links` is passed in, not constructed.** Today the service fills it with the `mailto:`
  support link and the settings-page URL. Keeping it a parameter means the deferred token flow
  changes one file instead of every notifier — a notifier that built its own unsubscribe URL
  would have to learn about tokens later.
- **`EventRecord` is imported from `event.repository.port.ts`.** A `domain/` file importing
  from `database/` is normally forbidden by `no-domain-to-infra-deps` in
  `.dependency-cruiser.cjs`, but that rule carries `pathNot: ['port\\.ts$']` — depending on a
  port interface is the sanctioned escape hatch.

## Module layout

`src/modules/user-notification/`:

```
index.ts                                       # Dependencies augmentation
user-notification.service.ts                   # handleEvent, fan-out, send
user-notification.route.ts                     # preferences
user-notification.mapper.ts
domain/
  user-notification.domain.ts                  # catalog, default merge (pure)
  user-notification.types.ts                   # the contract above
  user-notification.errors.ts                  # UnknownCategoryError
database/
  user-notification.repository.{ts,port.ts,mock.ts,record.ts}
  notification-preference.repository.{ts,port.ts,mock.ts,record.ts}
dtos/
  notification-preference.response.dto.ts
  update-notification-preferences.request.dto.ts
queries/
  get-notification-preferences.query.ts
```

`src/modules/event/event-dispatcher.service.ts` — new file in the existing module.

`src/modules/model-comment/notifications/model-comment.notifier.ts` — new subdirectory. The
existing module subdirectory names in this codebase are `database`, `domain`, `dtos`,
`queries`, `schemas`, `shared`; `notifications/` is new, and reads better than dropping the
notifier at module root next to the service.

Reasoning for `user-notification` being a full module rather than something under
`src/shared/`: it has a persistence model, a repository, DTOs, routes, and domain rules. That
is a DDD aggregate, not cross-cutting infrastructure. Contrast with
`src/shared/permissions/` in `[[permission-unification-plan]]`, which has no entities and no
repository and correctly lives in `shared/`.

## Domain module

`domain/user-notification.domain.ts` is pure — no repository access, no I/O:

```ts
const catalog = {
  'comment.on_your_model': {
    label: 'Comments on your models',
    description: 'When someone comments on a model you author.',
    defaults: { email: true, inApp: true },
  },
  'comment.reply_to_you': {
    label: 'Replies to your comments',
    description: 'When someone replies directly to a comment you wrote.',
    defaults: { email: true, inApp: true },
  },
} as const;

export default function userNotificationDomain() {
  return {
    categories,                                       // catalog as an array, for the GET route
    isKnownCategory(value: string): value is NotificationCategory,
    resolvePreference(category, override): { email: boolean; inApp: boolean },
  };
}
```

The catalog is the single source of truth for what a preference row may reference. A row whose
`category` is not in the catalog is ignored on read and rejected on write — this keeps a
renamed or retired category from silently suppressing notifications.

The domain stays pure — no repository access, no token issuance.

## Unsubscribe: deferred

One-click unsubscribe from an email link is **out of scope for this plan** and gets its own.
Until then, emails keep the footer link they have today,
`` `mailto:${env.product.supportEmail}` ``, and the only self-serve control is the
authenticated preference API.

This is not a regression — it is exactly what `model-comment.service.ts:80` does now — but it
is worth naming the gap plainly: until either the frontend settings page or the token flow
lands, a recipient who wants fewer emails has to write to support and have a human act on it.
Preferences are enforced from day one; what is missing is a way to reach them without signing
in.

The design work is recorded here so the later plan starts from a conclusion rather than a blank
page.

### What that plan should use

Better Auth's existing `Verification` table via `internalAdapter`, not a hand-rolled HMAC and
not either of the two plugins that look like they fit. `auth.$context` (typed
`Promise<AuthContext & InferPluginContext>`) exposes `internalAdapter` outside of a request,
which is what makes it usable from a cron worker acting for a user who is not present:

```ts
const ctx = await auth.$context;
await ctx.internalAdapter.createVerificationValue({
  identifier: `notification-unsubscribe:${token}`,
  value: userId,
  expiresAt,
});
const row = await ctx.internalAdapter.findVerificationValue(`notification-unsubscribe:${token}`);
```

**One token per user, reused across every notification email.** Verification rows are not swept
in the background — `magicLink` checks `expiresAt` at read time
(`plugins/magic-link/index.mjs:125`) rather than deleting on a schedule — so minting per send
would grow a table that sits on the hot path for email verification, password reset, and OAuth
state, without bound. `issueUnsubscribeToken(userId)` finds a live row first and mints only when
there isn't one, refreshing `expiresAt` on reuse. Row count is then bounded by users who have
ever been notified.

The token answers *who*, not *what*. The category travels in the frontend URL and the request
body; the stored `value` is the only authority on identity. Tampering with the category lets the
holder unsubscribe themselves from a different category, which they could already do — no
privilege gain. In exchange the token becomes **revocable**: delete the row and every
outstanding link for that user dies, something an HMAC cannot do without a secret rotation that
breaks everyone at once.

Two Better Auth plugins look like they fit and do not:

- **`oneTimeToken`** — `generateOneTimeToken` is session-gated (its `use` middleware resolves a
  session) and defaults to a 3-minute expiry. It is built for cross-domain session handoff.
- **`magicLink`** — works mechanically, but makes an unsubscribe link an authentication
  credential. Notification emails get forwarded, sit in shared inboxes, and surface in breaches;
  "stop emailing me" must not escalate to "sign in as me."

The cost to accept: `internalAdapter` is the surface Better Auth's own plugins use, not the
documented `auth.api.*` one. On `^1.5.6` a minor upgrade could move it, so the two calls should
stay behind a single `unsubscribe-token.service.ts` with an e2e test that mints and redeems a
real token, making a break loud rather than silent.

### Open questions for that plan

- **`List-Unsubscribe` / `List-Unsubscribe-Post` headers.** A token makes one-click unsubscribe
  possible, and it materially improves deliverability with Gmail and Outlook. But
  `List-Unsubscribe-Post` requires an endpoint the mail provider can POST to *without* a
  browser, so the frontend-page indirection above needs a direct backend URL alongside it.
  Decide both together or the header gets bolted on badly.
- **Is `internalAdapter` stable enough to depend on?** It is the API Better Auth's own plugins
  use, not the documented `auth.api.*` surface, and `better-auth` is on `^1.5.6` with an active
  release cadence. Recommendation: accept it, contained behind one service file. The
  alternative — our own `NotificationUnsubscribeToken` table — is more code for the same shape
  and re-creates what `Verification` already is.

### What this plan does now so that plan stays cheap

`NotificationIntent.buildEmail` already receives a `NotificationLinks` argument
(`{ unsubscribeUrl, preferencesUrl }`) rather than constructing URLs itself. Today the service
fills it with the `mailto:` link and the settings-page URL. When the token flow lands, only the
service changes — every notifier keeps working untouched. Keeping that parameter now is the one
piece of forward-compatibility worth paying for.

## Service: fan-out

Per intent returned by a notifier:

1. Load the recipient via `userRepository.findOneById`. Skip if missing, `deletedAt` is set,
   `banned` is true, or there is no `email` — no ledger row is written for someone who could
   never receive it (see Open Questions 1).
2. `resolvePreference(intent.category, override)`. Skip the email channel if `email === false`;
   skip the ledger row if `inApp === false`.
3. Insert the ledger row inside `transactionManager.run`. A unique-constraint violation on
   `(eventId, recipientId, category)` means this was already delivered on an earlier pass —
   skip, do not resend.
4. `await intent.buildEmail(recipient, links)` → `await mailService.sendMail(...)`.
5. On success stamp `emailSentAt`. On failure log and leave it null, so a future sweeper can
   retry from the ledger without re-running the notifier.

The service also exposes `handles(eventType)` — the union of its notifiers' `eventTypes` — so
the dispatcher can filter without doing any work.

## Dispatcher

```ts
export default function makeEventDispatcherService({ userNotificationService, logger }: Dependencies) {
  const subscribers: Array<EventSubscriber> = [userNotificationService];

  return {
    async dispatch(event: EventRecord): Promise<void> {
      const targets = subscribers.filter((s) => s.handles(event.type));
      if (targets.length === 0) return;

      const results = await Promise.allSettled(targets.map((s) => s.handleEvent(event)));
      const failures = results.filter((r) => r.status === 'rejected');
      for (const failure of failures) {
        logger.error({ name: 'EventDispatcher', message: 'Subscriber failed', error: failure.reason });
      }
      if (failures.length > 0) throw new AggregateError(failures.map((f) => f.reason));
    },
  };
}
```

`Promise.allSettled` isolates subscribers from each other; the rethrow lets the processor
record the attempt so the event is retried on the next tick.

## Schema

```prisma
model UserNotification {
  id          String    @id @default(uuid())
  recipientId String
  eventId     String
  category    String
  title       String
  body        String    @db.Text
  url         String
  emailSentAt DateTime? @db.Timestamptz(3)
  readAt      DateTime? @db.Timestamptz(3)   // unused this pass; here for the planned feed
  createdAt   DateTime  @default(now()) @db.Timestamptz(3)

  recipient User  @relation(fields: [recipientId], references: [id], onDelete: Cascade)
  event     Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([eventId, recipientId, category])
  @@index([recipientId, readAt, createdAt])
}

model UserNotificationPreference {
  id        String   @id @default(uuid())
  userId    String
  category  String
  email     Boolean
  inApp     Boolean
  updatedAt DateTime @updatedAt @db.Timestamptz(3)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category])
}
```

On `Event`: `attempts Int @default(0)`, `lastError String? @db.Text`, and the back-relation
`notifications UserNotification[]`. On `User`: `notifications UserNotification[]` and
`notificationPreferences UserNotificationPreference[]`.

Preference rows are **sparse overrides** — absence means "use the catalog default". No backfill
migration, and adding a category later needs no data change.

The `@@index([recipientId, readAt, createdAt])` is for the feed that is out of scope here. It
costs one index now and saves a migration later.

## Routes

| Route | Auth | Behaviour |
|---|---|---|
| `GET /v1/me/notification-preferences` | `requireAuth` | Catalog merged with the caller's overrides: `{ categories: [{ category, label, description, email, inApp }] }` |
| `PATCH /v1/me/notification-preferences` | `requireAuth` | Body `{ preferences: [{ category, email?, inApp? }] }`. Upsert per category, `204`. Unknown category → 400. |
Both routes require a session. There is no unauthenticated unsubscribe route in this plan — see
"Unsubscribe: deferred". When one is added it must be a **POST**, not a GET: email link scanners
and corporate URL-prefetchers follow GET links and would unsubscribe people who never clicked.

## Idempotency and failure handling

- **Duplicate sends** are prevented by `@@unique([eventId, recipientId, category])`. If the
  worker dies between sending and `markProcessed`, the next pass re-resolves the same intents,
  hits the constraint, and skips.
- **Concurrent workers.** Workers run in the API process (`src/server/index.ts:82`; there is no
  separate worker container), so N API replicas means N pollers. pg-boss's `schedule()` stores
  the cron in its own schema and emits one job per tick globally, so only one replica processes
  each batch. The unique index is belt-and-braces for the case where that assumption breaks.
- **Poison events.** `markFailed(id, error)` increments `attempts` and stores `lastError`.
  `findUnprocessed` filters on `attempts < rules.limits.notification.maxEventAttempts`, so a
  permanently-failing event stops consuming batch slots after five tries while remaining
  visible in the admin events list (`GET /api/v1/admin/events`) with its error attached.
- **Notifier isolation.** One throwing notifier does not prevent the others from running for
  the same event.

Delivery latency becomes up to ~60s (the cron interval) plus SMTP time, against roughly
instant today. This is an accepted trade: nothing about a comment notification is
latency-sensitive, and the alternative — having the service nudge the queue after commit —
would reintroduce a service→queue dependency that the outbox pattern exists to avoid.

## Migration of existing call sites

| File | Change |
|---|---|
| `src/modules/mail/mail.service.ts` | Promisify `sendMail` so rejections propagate. Keep both existing log lines. Without this the ledger's `emailSentAt` is meaningless — it would be stamped on every send regardless of outcome. |
| `src/modules/model-comment/model-comment.service.ts` | Delete `truncatePreview` (lines 9-12), `buildEmailModel` (55-76), `notifyOnNewComment` (78-164), and the `void notifyOnNewComment(entity, parent)` call at line 209. Drop the now-unused deps `modelAuthorRepository`, `userRepository`, `getModelCardQuery`, `mailService`, `mailDomain` from the factory signature, and the `env` / `EmailModel` imports. The service becomes purely transactional. |
| `src/modules/model-comment/model-comment.service.spec.ts` | Remove the notification block and the `flushMicrotasks` helper; the transactional assertions stay. The removed assertions move to the notifier spec. |
| `src/workers/event-processor.ts` | Accept `eventDispatcherService`. Per event: `try { await dispatch(event); await markProcessed(id) } catch (e) { await markFailed(id, e) }`. `BATCH_SIZE` moves to `rules.limits.notification.eventBatchSize`. |
| `src/workers/index.ts` | Pull `eventDispatcherService` from `fastify.diContainer.cradle` (line 15) and pass it to `startEventProcessor`. |
| `src/modules/event/database/event.repository.{ts,port.ts,mock.ts}` | Add `markFailed(id, error)`. Add `attempts: number` and `lastError: string \| null` to `EventRecord`. `findUnprocessed` gains the `attempts` ceiling. |
| `src/modules/event/database/event.repository.port.ts` | Add the three emitted-but-missing types to `KnownEvents`: `model.created`, `model.version.created`, `model.version.updated` — all three are emitted by `model-draft.service.ts` (lines 558, 660) but absent from the union. Note the pre-existing inconsistency that `model-version.service.ts` emits `model_version.created` for near-identical semantics; reconciling those two is out of scope here. |
| `src/server/di/index.ts` | Add `notifier` to the first `loadModules` glob (line 20). Delete the second `loadModules` call (lines 33-44): it globs `*.{handler,event-handler}` and matches zero files, and its `asyncInit: 'init'` fires in Fastify's `onReady` — i.e. *after* `startWorkers` at `src/server/index.ts:82` — which is a latent race for anything that self-registers there. |
| `.dependency-cruiser.cjs` | Add `'\\.notifier\\.ts$'` to `applicationLayerPaths` (lines 5-10) so notifiers inherit `no-command-query-to-api-deps` and cannot reach into `dtos/` or routes. |
| `src/config/rules.ts` | Add `limits.notification`: `eventBatchSize: 50`, `maxEventAttempts: 5`, `previewLength: 280`. The first two are currently module-local constants in `event-processor.ts`; the third is the `max = 280` default in `truncatePreview`. |
| `prisma/schema.prisma` | The two models above plus the `Event` and `User` additions, then `yarn run db:migrate:dev` and `yarn run db:generate` with the regenerated client committed. |

## Rollout

Five PRs, tracked at `.ongoing/modeling-commons-backend/durable-notifications/`. Merge order:

1. `mail-await-1` — promisify `sendMail`. Independent, and the current inline path already
   sits inside `Promise.allSettled` with a logger, so rejections simply start surfacing there.
2. `schema-2` — tables, `Event` retry columns, repositories and mocks. No behavior change.
3. `preferences-3` — domain, DTOs, query, and the three routes. Fully user-visible on its own,
   before any dispatch exists.
4. `dispatch-4` — the contract types, dispatcher, `handleEvent`, processor wiring, DI and
   dependency-cruiser changes. No notifiers registered yet, so dispatch is a no-op end to end
   while every seam is unit-tested.
5. `comment-notifier-5` — the cutover. Add the notifier, delete the inline send.

The ordering means the inline send keeps working until PR 5, and PR 5 is a move rather than a
rewrite.

## Tests

Unit specs are colocated (`*.spec.ts` next to source), built by calling the factory directly
with a hand-built dependencies literal cast `as never`, using the module's own
`*.repository.mock.ts` and the shared `src/shared/test/mock-transaction-manager.ts`. Domain is
used real, never mocked. Import `beforeEach` from `vitest`, never `node:test` — the wrong
import silently no-ops the hook.

- **`user-notification.domain.spec.ts`** — catalog defaults; override merge; unknown category
  rejected.
- **`user-notification.service.spec.ts`** — opted-out recipient gets no mail and no ledger row;
  recipient with no email is skipped; soft-deleted and banned recipients are skipped; ledger
  unique-violation short-circuits the resend; a `sendMail` rejection leaves `emailSentAt` null
  and is logged rather than thrown; `buildEmail` is never invoked for a filtered-out intent.
- **`event-dispatcher.service.spec.ts`** — filters by `handles`; a throwing subscriber does not
  prevent others from running; the aggregate rethrow reaches the caller.
- **`model-comment.notifier.spec.ts`** — carries over the existing assertions from
  `model-comment.service.spec.ts`: owner and contributor both notified; commenter never
  notified; parent author receives the reply template and is excluded from the
  commented-on-model set; `highlightedCommentId` present in the URL with the thread rooted at
  the parent; `getModelCardQuery` failure falls back to `'a model'`.
- **`event-processor.spec.ts`** (existing) — updated for `dispatch`; `markFailed` on throw;
  an event at `maxEventAttempts` is not re-selected.

New repository mocks follow `src/modules/model/database/model.repository.mock.ts` — a
`{ [K in keyof Port]: ReturnType<typeof vi.fn> }` mapped type, so adding a port method and
forgetting the mock entry is a type error.

E2E (cucumber, `tests/api/`): a new `user-notification.feature` + `.steps.ts` covering
preference defaults, override roundtrip, and unknown category rejection. Both routes require a
session, so the feature also asserts an anonymous request is rejected. The two scenarios at
`tests/api/model-comment.feature:179` and `:193` currently assert
inline sending and must move here, triggering the batch with `boss.send('process-events', {})`
the way `tests/api/workers.steps.ts:42-45` already does, and capturing mail with the
`mailService.sendMail` monkey-patch and `waitForMailCalls` helper at
`tests/api/model-comment.steps.ts:314-344`.

## Open questions and decisions

1. **Skip unreachable recipients at fan-out or at send?** A soft-deleted, banned, or
   email-less user could still get a ledger row (useful if the in-app feed later shows it) or
   be dropped entirely. Recommendation: drop at fan-out. A banned user has no feed to read,
   and a ledger row with a permanently-null `emailSentAt` looks like a delivery failure to any
   future sweeper.

2. **Should `emailSentAt IS NULL` rows be swept and retried?** A second worker could pick up
   ledger rows whose send failed and retry them without re-running the notifier. Recommendation:
   defer. The event-level `attempts` retry already covers transient SMTP failures, since a
   failed dispatch leaves the event unprocessed. The column exists so a dedicated sweeper stays
   possible if event-level retry proves too coarse.

3. **`inApp: false` — suppress the ledger row, or store it and hide it?** Storing everything
   makes "turn the feed back on and see history" possible; suppressing keeps the table honest
   about what the user asked for. Recommendation: suppress. Storing notifications a user
   explicitly declined is the kind of thing that is hard to justify later, and the feed is not
   built yet.

4. **Category naming.** `comment.on_your_model` and `comment.reply_to_you` are user-facing
   preference keys, not event types, and deliberately do not mirror `model_comment.created`.
   One event fans out to two categories. Confirm this split is wanted before the catalog
   ossifies into stored rows.

5. **Do preference writes belong in this module or in `user`?** They are user-scoped settings,
   but they are not `User` columns and do not go through Better Auth. Recommendation: keep them
   here. The `user` module's `updateFields` whitelist and the Better Auth `additionalFields`
   list stay untouched, which is the point of choosing a separate table.

## Cross-links

- `[[legacy-migration-discussion-plan]]` — owns the comment module and its recipient rules; the
  notifier is a move of logic that plan put in place, not a redesign of it.
- `[[legacy-migration-search-spec]]` — proposes a pg-boss handler for FTS indexing and asserts
  one "already exists". It does not: the placeholder in `event-processor.ts` is all there is,
  and the event type that spec names (`model.version.published`) is emitted as
  `model.version.created`. `eventDispatcherService` is the seam that spec should register a
  second subscriber on.
- `[[permission-unification-plan]]` — the contrasting placement decision: cross-cutting policy
  with no entities belongs in `src/shared/`, whereas this feature has a persistence model and
  routes, so it is a module.
