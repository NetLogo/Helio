# Legacy Migration: Reporting (`PossibleSpamController` → generic `report` module)

## Overview

The legacy Rails `PossibleSpamController`
(`modelingcommons/app/controllers/possible_spam_controller.rb`) is a single
`mark_as_spam` action that writes a `SpamWarning(person_id, node_id, created_at)`
row and fires an admin email via `Notifications.spam_warning`. It is **model-only**
— the legacy schema (`db/migrate/20090222003149_create_spam_warnings.rb`)
hard-codes `model_id` (the `:node_id` parameter is a model node in legacy
parlance).

This migration **widens** that surface area: instead of porting `SpamWarning`
1:1, we introduce a polymorphic `Report` aggregate that can target a **model**,
a **user**, or a **comment**, and can carry a **kind** (spam | abuse |
copyright | other), a free-form **reason**, and a moderator **status**
(open | reviewed | dismissed | resolved). Spam-on-a-model becomes the special
case `resourceType = 'model', kind = 'spam'`. We're greenfield, so there is no
back-compat constraint — the Rails table and controller can be retired
outright.

The new module lives at `src/modules/report/` and follows the DDD skeleton
used by `model-author` and `model-comment` (see [[legacy-migration-discussion-plan]]).

---

## 1. Legacy → modern mapping

| Legacy                                        | Modern                                                            |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `SpamWarning.person_id`                       | `Report.reporterUserId`                                           |
| `SpamWarning.node_id` (always a Model)        | `Report.resourceId` with `resourceType = 'model'`                 |
| _(implicit kind)_                             | `Report.kind = 'spam'`                                            |
| _(no reason field)_                           | `Report.reason` (free-form, up to ~2000 chars)                    |
| `SpamWarning.created_at`                      | `Report.createdAt`                                                |
| `after_save :notify_administrators`           | post-commit `mailService.sendMail` to admin alert email           |
| `Notifications.spam_warning(node, person)`    | `mailDomain.createNotificationEmail` (generic template, for MVP)  |
| _(no resolution lifecycle)_                   | `Report.status`, `resolverUserId`, `resolverNote`, `resolvedAt`   |
| Admin "list" view (unimplemented in legacy)   | `GET /v1/admin/reports` paginated, filterable                     |

There is no data migration step — there are no legacy `SpamWarning` rows worth
preserving in the greenfield deployment. If a backfill is ever requested, the
mapping above is enough to script it.

---

## 2. Schema delta (`prisma/schema.prisma`)

One Prisma migration. Adds three enums, one table, and two back-relations on
`User`. **No FK is added** to `Model`, `User`, or `ModelComment` from
`resourceId` — see the trade-off note below.

```prisma
enum ReportResourceType {
  model
  user
  comment
}

enum ReportKind {
  spam
  abuse
  copyright
  other
}

enum ReportStatus {
  open
  reviewed
  dismissed
  resolved
}

model Report {
  id              String              @id @default(uuid())
  resourceType    ReportResourceType
  resourceId      String
  reporterUserId  String
  kind            ReportKind
  reason          String              // up to ~2000 chars, validated at the DTO layer
  status          ReportStatus        @default(open)
  resolverUserId  String?
  resolverNote    String?
  createdAt       DateTime            @default(now()) @db.Timestamptz(3)
  resolvedAt      DateTime?           @db.Timestamptz(3)

  reporter        User                @relation("ReportReporter", fields: [reporterUserId], references: [id], onDelete: Cascade)
  resolver        User?               @relation("ReportResolver", fields: [resolverUserId], references: [id], onDelete: SetNull)

  @@unique([resourceType, resourceId, reporterUserId])
  @@index([resourceType, resourceId])
  @@index([status, createdAt])
  @@index([reporterUserId])
}
```

Back-relations to add to `User`:

```prisma
// inside model User { ... }
submittedReports Report[] @relation("ReportReporter")
resolvedReports  Report[] @relation("ReportResolver")
```

Notes / trade-offs:

- **No DB-level FK on `resourceId`.** The alternatives — three nullable FK
  columns (`modelId? userId? commentId?`) with a CHECK that exactly one is
  set, or a separate join table per type — both add complexity that buys very
  little: the service layer already has to dispatch on `resourceType` to call
  the right module's existence check, and we already lean on soft-delete
  conventions elsewhere (so a "dangling" `resourceId` after a hard purge is
  fine, the row stays as audit trail). Documented here so the next person
  doesn't try to "fix" it.
- **Unique constraint** `(resourceType, resourceId, reporterUserId)` prevents
  the same user from re-filing on the same resource. We **throw 409
  `DuplicateReportError`** on the second attempt; the client should surface a
  "you've already reported this" message. We do not currently expose a PATCH
  for users to amend their own report — keep it simple for MVP.
- `reporter.onDelete: Cascade` — if a user is hard-deleted (GDPR), their
  reports go with them. `resolver.onDelete: SetNull` — admin departures
  preserve the audit trail, just lose the "resolved by whom" pointer.
- `@@index([status, createdAt])` is the primary admin queue index — the
  "open" queue is ordered by `createdAt asc` (oldest first).

---

## 3. Module layout

Mirrors `src/modules/model-author/` and `src/modules/model-comment/`:

```
src/modules/report/
├── domain/
│   ├── report.domain.ts
│   ├── report.domain.spec.ts
│   ├── report.errors.ts
│   └── report.types.ts
├── database/
│   ├── report.record.ts
│   ├── report.repository.ts
│   ├── report.repository.port.ts
│   └── report.repository.mock.ts
├── dtos/
│   ├── submit-report.request.dto.ts
│   ├── update-report.request.dto.ts
│   ├── list-reports.query.dto.ts
│   ├── report.response.dto.ts
│   └── report.paginated.response.dto.ts
├── queries/
│   ├── get-report.query.ts
│   └── list-reports.query.ts
├── report.mapper.ts
├── report.route.ts
├── report.service.ts
├── report.service.spec.ts
└── index.ts
```

`index.ts` adds the awilix registrations and the `Dependencies` augmentation
(`reportRepository`, `reportDomain`, `reportMapper`, `reportService`,
`getReportQuery`, `listReportsQuery`). Routes are imported and registered
from the app entrypoint exactly the way `model-author` is.

---

## 4. Domain (`domain/`)

### `report.types.ts`

```ts
import type { Report } from '#prisma/index';
import { ReportResourceType, ReportKind, ReportStatus } from '#prisma/index';

export { ReportResourceType, ReportKind, ReportStatus };
export type ReportEntity = Report;

export type CreateReportProps = {
  resourceType: ReportResourceType;
  resourceId: string;
  reporterUserId: string;
  kind: ReportKind;
  reason: string;
};
```

### `report.errors.ts`

All error classes extend the existing shared exception hierarchy
(`#src/shared/exceptions/index.ts`), matching the pattern in
`model-author.errors.ts`.

- `ReportNotFoundError` → `NotFoundException` ("Report {id} not found")
- `DuplicateReportError` → `ConflictException` ("You have already reported
  this resource") — 409
- `TargetResourceNotFoundError` → `NotFoundException` ("Reported
  {resourceType} {resourceId} does not exist")
- `InvalidStatusTransitionError` → `BadRequestException` ("Cannot transition
  report from {from} to {to}")
- `CannotReportOwnContentError` → `ForbiddenException` (defensive — a user
  shouldn't be able to report content they themselves authored; cheap check
  at submit time, not enforced for `kind = 'spam'` since you can report your
  own model as spam if you want, but enforced for `kind = 'abuse'` on a user
  resource where `resourceId === reporterUserId`). Optional, can be deferred —
  flagged in open questions.

### `report.domain.ts`

Pure factory + transition rules. No I/O.

```ts
export default function reportDomain() {
  return {
    createReport(props: CreateReportProps): ReportEntity {
      if (props.reason.trim().length === 0) {
        throw new EmptyReasonError();
      }
      return {
        id: crypto.randomUUID(),
        ...props,
        status: 'open',
        resolverUserId: null,
        resolverNote: null,
        createdAt: new Date(),
        resolvedAt: null,
      };
    },

    assertValidTransition(from: ReportStatus, to: ReportStatus): void {
      // open      -> reviewed | dismissed | resolved   ok
      // reviewed  -> dismissed | resolved | open       ok (admin can reopen during triage)
      // dismissed -> open                              ok (reopen)
      // resolved  -> open                              forbidden by default
      // same -> same                                   no-op, allowed (idempotent PATCH)
      if (from === to) return;
      const allowed: Record<ReportStatus, ReportStatus[]> = {
        open:      ['reviewed', 'dismissed', 'resolved'],
        reviewed:  ['open', 'dismissed', 'resolved'],
        dismissed: ['open'],
        resolved:  [],
      };
      if (!allowed[from].includes(to)) {
        throw new InvalidStatusTransitionError(from, to);
      }
    },

    applyResolution(report: ReportEntity, adminId: string, note: string | null, to: ReportStatus): ReportEntity {
      return {
        ...report,
        status: to,
        resolverUserId: to === 'resolved' || to === 'dismissed' ? adminId : report.resolverUserId,
        resolverNote: note ?? report.resolverNote,
        resolvedAt: to === 'resolved' || to === 'dismissed' ? new Date() : null,
      };
    },
  };
}
```

`resolved → open` is locked off behind a domain error so reopening a closed
case is an explicit code change rather than an accidental admin click. Revisit
if moderators push back.

---

## 5. Service (`report.service.ts`)

Cross-module dependencies (awilix-injected from `fastify.diContainer.cradle`):

- `transactionManager`
- `reportRepository`
- `reportDomain`
- `eventRepository`
- `modelRepository` — for `resourceType = 'model'` existence check
- `userRepository` — for `resourceType = 'user'`
- `modelCommentRepository` — for `resourceType = 'comment'` (gated on
  [[legacy-migration-discussion-plan]] landing first; see §10)
- `mailService`, `mailDomain` — admin notification
- `logger` — mail failures should not throw

Pseudocode (the actual file follows `model-author.service.ts` style):

```ts
async function submit(input: SubmitReportInput, callerId: string): Promise<{ id: string }> {
  await assertTargetExists(input.resourceType, input.resourceId);

  const existing = await reportRepository.findByCompositeKey(
    input.resourceType, input.resourceId, callerId,
  );
  if (existing) throw new DuplicateReportError();

  const entity = reportDomain.createReport({ ...input, reporterUserId: callerId });

  await transactionManager.run(async (ctx) => {
    await reportRepository.insertTx(ctx, entity);
    await eventRepository.insert(ctx, {
      type: 'report.submitted',
      actorId: callerId,
      resourceType: input.resourceType,           // mirrors the reported resource
      resourceId: input.resourceId,
      payload: { reportId: entity.id, kind: input.kind },
    });
  });

  // Post-commit, fire-and-forget. Don't await the SMTP roundtrip on the request path.
  void notifyAdmins(entity).catch((err) =>
    logger.error({ name: 'ReportService', message: 'admin notify failed', err }),
  );

  return { id: entity.id };
}

async function assertTargetExists(resourceType: ReportResourceType, resourceId: string): Promise<void> {
  switch (resourceType) {
    case 'model': {
      const m = await modelRepository.findById(resourceId);
      if (!m || m.deletedAt) throw new TargetResourceNotFoundError(resourceType, resourceId);
      return;
    }
    case 'user': {
      const u = await userRepository.findById(resourceId);
      if (!u || u.deletedAt) throw new TargetResourceNotFoundError(resourceType, resourceId);
      return;
    }
    case 'comment': {
      const c = await modelCommentRepository.findById(resourceId);
      if (!c || c.deletedAt) throw new TargetResourceNotFoundError(resourceType, resourceId);
      return;
    }
  }
}

async function updateStatus(reportId: string, body: UpdateReportInput, adminId: string): Promise<void> {
  const existing = await reportRepository.findById(reportId);
  if (!existing) throw new ReportNotFoundError(reportId);

  // Defensive: an admin who happens to be the reporter cannot also resolve
  // their own report (separation of duties).
  if (existing.reporterUserId === adminId) {
    throw new ForbiddenException('You cannot resolve a report you submitted');
  }

  reportDomain.assertValidTransition(existing.status, body.status);
  const next = reportDomain.applyResolution(existing, adminId, body.resolverNote ?? null, body.status);

  await transactionManager.run(async (ctx) => {
    await reportRepository.updateStatusTx(ctx, next);
    await eventRepository.insert(ctx, {
      type: 'report.status_changed',
      actorId: adminId,
      resourceType: existing.resourceType,
      resourceId: existing.resourceId,
      payload: {
        reportId: existing.id,
        from: existing.status,
        to: next.status,
        resolverNote: next.resolverNote,
      },
    });
  });
}

async function notifyAdmins(report: ReportEntity): Promise<void> {
  // MVP: single env var. See §13 open questions for the iterate-admins alternative.
  const to = env.product.adminAlertEmail ?? env.product.supportEmail;
  const content = await mailDomain.createNotificationEmail(
    to,
    'Moderation team',
    `A new ${report.kind} report was filed on ${report.resourceType} ${report.resourceId}. ` +
      `Reason: ${report.reason.slice(0, 500)}`,
    `${env.product.frontendUrl}/admin/reports`,   // unsubscribeUrl placeholder; admin list link
  );
  await mailService.sendMail(content);
}
```

The query handlers live in `queries/` (read-side):

- `getReportQuery.execute(id) -> ReportEntity` — thin wrapper over the
  repository, used by `GET /v1/admin/reports/:id`.
- `listReportsQuery.execute(filters, paginate) -> Paginated<ReportEntity>` —
  uses `paginatedQueryBase()` (`#src/shared/ddd/query.base.ts`) then delegates
  to `reportRepository.list(filters, params)`.

---

## 6. Repository port (`database/report.repository.port.ts`)

```ts
export interface ReportRepository {
  findById(id: string): Promise<ReportEntity | undefined>;
  findByCompositeKey(
    resourceType: ReportResourceType,
    resourceId: string,
    reporterUserId: string,
  ): Promise<ReportEntity | undefined>;
  list(
    filters: ReportListFilters,
    params: PaginatedQueryParams,
  ): Promise<Paginated<ReportEntity>>;
  insertTx(ctx: TransactionContext, entity: ReportEntity): Promise<void>;
  updateStatusTx(ctx: TransactionContext, entity: ReportEntity): Promise<void>;
}

export type ReportListFilters = {
  status?: ReportStatus;
  resourceType?: ReportResourceType;
  kind?: ReportKind;
  createdAfter?: Date;
  createdBefore?: Date;
};
```

- The Prisma impl in `report.repository.ts` follows
  `model-author.repository.ts`: `db.report.findUnique({ where: {...} })`,
  `findFirst`, etc. `list` uses `Promise.all([db.report.count, db.report.findMany])`
  with a `where` built from the filters (only-set fields included) and
  `paginate(data, params, count)` from `#src/shared/db/repository.port.ts`.
- The mock in `report.repository.mock.ts` mirrors the
  `mockModelAuthorRepository` style (all methods as `vi.fn()`), for service-spec
  injection.

`report.record.ts` re-exports `Report as ReportRecord` from `#prisma/index`
(same pattern as `model-author.mapper.ts`'s `ModelAuthorRecord`).

---

## 7. DTOs (`dtos/`)

All Typebox, following the `model-author` DTO style.

### `submit-report.request.dto.ts`

```ts
export const submitReportRequestDtoSchema = Type.Object({
  resourceType: Type.Union([
    Type.Literal('model'),
    Type.Literal('user'),
    Type.Literal('comment'),
  ]),
  resourceId: Type.String({ format: 'uuid' }),
  kind: Type.Union([
    Type.Literal('spam'),
    Type.Literal('abuse'),
    Type.Literal('copyright'),
    Type.Literal('other'),
  ]),
  reason: Type.String({ minLength: 1, maxLength: 2000 }),
});
export type SubmitReportRequestDto = Static<typeof submitReportRequestDtoSchema>;
```

### `update-report.request.dto.ts`

```ts
export const updateReportRequestDtoSchema = Type.Object({
  status: Type.Union([
    Type.Literal('open'),
    Type.Literal('reviewed'),
    Type.Literal('dismissed'),
    Type.Literal('resolved'),
  ]),
  resolverNote: Type.Optional(Type.String({ maxLength: 2000 })),
});
export type UpdateReportRequestDto = Static<typeof updateReportRequestDtoSchema>;
```

### `list-reports.query.dto.ts`

```ts
export const listReportsQuerySchema = Type.Object({
  status:        Type.Optional(/* ReportStatus union */),
  resourceType:  Type.Optional(/* ReportResourceType union */),
  kind:          Type.Optional(/* ReportKind union */),
  createdAfter:  Type.Optional(Type.String({ format: 'date-time' })),
  createdBefore: Type.Optional(Type.String({ format: 'date-time' })),
  limit:         Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  page:          Type.Optional(Type.Integer({ minimum: 0 })),
});
export type ListReportsQueryDto = Static<typeof listReportsQuerySchema>;
```

### `report.response.dto.ts`

```ts
export const reportResponseDtoSchema = Type.Object({
  id:             Type.String({ format: 'uuid' }),
  resourceType:   Type.String(),                                       // enum string
  resourceId:     Type.String({ format: 'uuid' }),
  reporterUserId: Type.String({ format: 'uuid' }),
  kind:           Type.String(),
  reason:         Type.String(),
  status:         Type.String(),
  resolverUserId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  resolverNote:   Type.Union([Type.String(), Type.Null()]),
  createdAt:      Type.String({ format: 'date-time' }),
  resolvedAt:     Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});
export type ReportResponseDto = Static<typeof reportResponseDtoSchema>;
```

### `report.paginated.response.dto.ts`

Same intersect-with-base pattern as `model-author.paginated.response.dto.ts`.

**Identity leakage note.** All `GET`/`PATCH` endpoints that return
`reportResponseDtoSchema` are admin-only. We deliberately do not expose a
public "list reports against my model" endpoint — surfacing
`reporterUserId` to the reported user would enable retaliation. If we ever
add a non-admin endpoint, swap to a `reportPublicResponseDto` that strips
`reporterUserId`, `resolverUserId`, and `resolverNote`.

---

## 8. Routes (`report.route.ts`)

| Method | Path                          | preHandlers                              | Body / Query                   | Response                                | Notes                                       |
| ------ | ----------------------------- | ---------------------------------------- | ------------------------------ | --------------------------------------- | ------------------------------------------- |
| POST   | `/v1/reports`                 | `requireAuth`                            | `submitReportRequestDtoSchema` | `201 idDtoSchema`                       | Reporter = `request.user.id`                |
| GET    | `/v1/admin/reports`           | `requireAuth, requireRole('admin')`      | `listReportsQuerySchema`       | `200 reportPaginatedResponseSchema`     | Filterable + paginated                      |
| GET    | `/v1/admin/reports/:id`       | `requireAuth, requireRole('admin')`      | —                              | `200 reportResponseDtoSchema`           | 404 via `ReportNotFoundError`               |
| PATCH  | `/v1/admin/reports/:id`       | `requireAuth, requireRole('admin')`      | `updateReportRequestDtoSchema` | `204`                                   | Sets `resolverUserId`/`resolvedAt` on close |

No `DELETE`. Reports are an audit trail; admins can mark `dismissed` to
"remove from queue" semantics. Hard-delete is reserved for GDPR via the user
purge flow (the cascade on `reporterUserId` handles it).

Route file uses the standard `fastify.withTypeProvider<TypeBoxTypeProvider>()`
pattern from `model-author.route.ts` — `fastify.diContainer.cradle` provides
`reportService, reportMapper, getReportQuery, listReportsQuery`.

---

## 9. Resource existence checks — cross-module dependency

The service does target validation by dispatching on `resourceType` to the
relevant module's repository. **The report module does not own validation
logic for its targets** — that lives in `model`, `user`, and `model-comment`.
This is the cleanest way to keep the polymorphic aggregate without dragging
in three-FK schema gymnastics.

Awilix wiring in `src/modules/report/index.ts`:

```ts
declare global {
  export interface Dependencies {
    reportRepository: ReportRepository;
    reportDomain:     ReturnType<typeof reportDomain>;
    reportMapper:     Mapper<ReportEntity, ReportRecord, ReportResponseDto>;
    reportService:    ReturnType<typeof import('./report.service.ts').default>;
    getReportQuery:   ReturnType<typeof import('./queries/get-report.query.ts').default>;
    listReportsQuery: ReturnType<typeof import('./queries/list-reports.query.ts').default>;
  }
}
```

The service factory's `Dependencies` destructure pulls in
`modelRepository`, `userRepository`, and `modelCommentRepository` — all
already registered by their owning modules. No new shared infra.

**Sequencing.** `model-comment` lands as part of
[[legacy-migration-discussion-plan]]. If `report` ships first:

1. Build the module with `resourceType` enum containing only `model` and
   `user`.
2. When `model-comment` lands, add `comment` to the Prisma enum (one-line
   migration), add the third `case` to `assertTargetExists`, add the
   `modelCommentRepository` injection, ship.

The cost of doing it this way is one extra Prisma enum migration; the
benefit is unblocking the moderation MVP. Call this out at scoping time.

---

## 10. Events

Two new event types written to the existing `Event` table (no schema change
on `Event`):

| `type`                    | `actorId`         | `resourceType` / `resourceId`             | `payload`                                                                  |
| ------------------------- | ----------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| `report.submitted`        | reporter user id  | mirrors `report.resourceType/resourceId`  | `{ reportId, kind }`                                                       |
| `report.status_changed`   | admin user id     | mirrors `report.resourceType/resourceId`  | `{ reportId, from, to, resolverNote }`                                     |

Mirroring the reported-resource fields (rather than `resourceType: 'report'`)
makes the audit trail discoverable from the resource's perspective — when
auditing a model, you naturally see "someone reported this for spam" in the
same query as ownership transfers and version pushes.

---

## 11. Tests

### Unit

- `domain/report.domain.spec.ts`
  - `createReport` rejects empty `reason`.
  - `assertValidTransition` table-driven: every `(from, to)` pair covered;
    `resolved -> open` throws.
  - `applyResolution` only sets `resolverUserId`/`resolvedAt` for terminal
    states.
- `report.service.spec.ts` (mock repositories via `mockReportRepository`,
  inject `mockModelRepository` / `mockUserRepository` /
  `mockModelCommentRepository`)
  - `submit` happy path → `insertTx` and `eventRepository.insert` called in
    same `transactionManager.run`.
  - `submit` against missing target throws `TargetResourceNotFoundError`.
  - `submit` second time same reporter+resource throws
    `DuplicateReportError` (409).
  - `submit` against a soft-deleted model throws
    `TargetResourceNotFoundError`.
  - `updateStatus` rejects forbidden transitions
    (`InvalidStatusTransitionError`).
  - `updateStatus` rejects an admin trying to close their own report.
  - `updateStatus` writes `report.status_changed` event with correct
    `from`/`to`.
  - Mail send failure does not abort the transaction nor surface to the
    caller (`logger.error` was called).

### Integration

Gherkin feature file `tests/api/report.feature` + steps `report.steps.ts`,
following `model-author.feature` style:

- `POST /v1/reports` requires auth (401 anonymous).
- `POST /v1/reports` against a real model returns 201 + id.
- Second `POST` same reporter+resource returns 409.
- `POST` against a non-existent UUID returns 404.
- `GET /v1/admin/reports` returns 403 for non-admin user, 200 for admin,
  paginated.
- Filter combinations: `?status=open`, `?resourceType=model&kind=spam`,
  `?createdAfter=...`.
- `PATCH /v1/admin/reports/:id` with `{ status: 'resolved', resolverNote: '…' }`
  returns 204 and the subsequent `GET` shows the resolution fields populated.
- `PATCH` an invalid transition (e.g. `resolved → open`) returns 400.

---

## 12. Open questions

1. **Admin recipient strategy.** MVP sends one email to
   `env.product.adminAlertEmail ?? env.product.supportEmail`. The
   alternative is iterating `User` where `role = 'admin'` (or
   `banned/role` filter — see `user.service.ts`) and BCCing. The latter
   scales worse, leaks list membership if mis-sent, and depends on admins
   keeping email preferences current. **Recommendation:** keep the single
   env var until a real moderation team exists. Add `PRODUCT_ADMIN_ALERT_EMAIL`
   to `env.ts`.
2. **Anti-abuse rate-limiting.** A single user spamming `POST /v1/reports`
   across many resources is a known DoS surface. **Recommendation:** reuse
   `src/server/plugins/rate-limit.ts`; apply a stricter bucket
   (e.g. 20 reports / hour / user) on the route. Don't roll a new
   per-user-per-day counter — the existing infra is enough. Numbers to be
   decided once the queue exists.
3. **Notify the reported resource's owner?** Telling a model author "your
   model was reported" leaks the existence of the report (and possibly the
   reporter via timing/social inference). **Recommendation:** no for MVP.
   The owner finds out when the admin takes action (model removal, comment
   deletion, account ban — those flows already notify).
4. **`GET /v1/reports/mine` for users to see their own submissions?**
   Useful for transparency, low risk (you only see your own reports). Not in
   MVP scope but a clean follow-up — add when frontend asks for it.
5. **`CannotReportOwnContentError` enforcement.** Mentioned in §4. Worth
   adding for `kind = 'abuse'` on `resourceType = 'user'` where
   `resourceId === reporterUserId` (you cannot report yourself). The
   model-self-report case is harmless and a useful test signal. Decide at
   review time.
6. **Comment reports gated on `model-comment`.** See §9 — ship without
   `comment` enum value if `model-comment` is not yet merged. See
   [[legacy-migration-discussion-plan]].

---

## 13. Out of scope

- Frontend reporting UI (button on model/user/comment pages, admin queue
  view). Tracked separately on the frontend repo.
- In-app inbox / notification fan-out. Email-only for MVP.
- Automated spam classification (Bayesian filter, heuristics). All moderation
  is human-driven.
- Comment-target reports if `model-comment` hasn't landed — scaffold without
  the `comment` enum and follow up.
- Bulk admin actions (mark 50 reports dismissed at once). Add when the
  moderation team asks for it.
- Reporter reputation / weighting. Every reporter is equal in MVP.
