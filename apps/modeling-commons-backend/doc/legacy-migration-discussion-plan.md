# Legacy Migration: Discussion → `model-comment`

## Overview

The legacy Rails `DiscussionController` (`modelingcommons/app/controllers/discussion_controller.rb`)
exposes a flat-ish "posting" system attached to models, with HTML-escaping done in
the controller (`gsub!('<', '&lt;')`), Q&A flags (`is_question`, `answered_at`),
and untyped soft-delete by setting `deleted_at` on the row. We're rewriting it
greenfield as a new module `src/modules/model-comment/` that follows the DDD
skeleton already used by `model-author` and `model`. The new module supports
arbitrary-depth threading via a self-referencing `parentCommentId`, stores
markdown as-is (frontend renders/sanitizes), preserves thread structure on
delete via a tombstone projection, audits writes to the `Event` table, and
emails the model's authors after the write transaction commits. Q&A semantics
are dropped — modern forums get reactions/threads, not "mark as answered".

---

## 1. Schema delta (`prisma/schema.prisma`)

One Prisma migration: add the `ModelComment` table, plus the back-relations on
`Model` and `User`.

```prisma
model ModelComment {
  id              String   @id @default(uuid())
  modelId         String
  userId          String?           // null when author was hard-deleted (FK SetNull)
  parentCommentId String?           // null = top-level
  body            String?  @db.Text // null when soft-deleted (tombstone)
  createdAt       DateTime @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime @updatedAt      @db.Timestamptz(3)
  deletedAt       DateTime?         @db.Timestamptz(3)

  model   Model         @relation(fields: [modelId], references: [id], onDelete: Cascade)
  user    User?         @relation(fields: [userId],  references: [id], onDelete: SetNull)
  parent  ModelComment? @relation("CommentReplies", fields: [parentCommentId], references: [id], onDelete: Cascade)
  replies ModelComment[] @relation("CommentReplies")

  @@index([modelId, createdAt])
  @@index([parentCommentId])
  @@index([userId])
}
```

Back-relations to add:

```prisma
// inside model Model { ... }
comments ModelComment[]

// inside model User { ... }
comments ModelComment[]
```

Notes:

- `userId` is nullable because user accounts soft-delete via `User.deletedAt`,
  but a hard purge (admin tool, GDPR) should not orphan a thread. `onDelete:
  SetNull` keeps replies threading on the comment row even if the author
  vanishes.
- `body` is nullable so soft-deletion can null it out and we don't keep deleted
  text around. The `deletedAt` column is the source of truth for "is this
  comment deleted"; the null `body` is the projection.
- `onDelete: Cascade` on `parent` means hard-deleting a parent (we don't, but
  Prisma needs the rule) drops the subtree. Since we soft-delete, this is
  defensive.
- `@@index([modelId, createdAt])` powers the canonical "list all comments for a
  model in chronological order" query. `@@index([parentCommentId])` powers the
  tree assembly. `@@index([userId])` powers future "comments by user" admin
  views.

---

## 2. Module layout

```
src/modules/model-comment/
├── domain/
│   ├── model-comment.domain.ts
│   ├── model-comment.domain.spec.ts
│   ├── model-comment.errors.ts
│   └── model-comment.types.ts
├── database/
│   ├── model-comment.record.ts
│   ├── model-comment.repository.port.ts
│   ├── model-comment.repository.ts
│   └── model-comment.repository.mock.ts
├── dtos/
│   ├── create-comment.request.dto.ts
│   ├── update-comment.request.dto.ts
│   ├── comment.response.dto.ts
│   └── comment-tree.response.dto.ts
├── queries/
│   └── list-comments-tree.query.ts
├── model-comment.mapper.ts
├── model-comment.schemas.ts
├── model-comment.service.ts
├── model-comment.service.spec.ts
├── model-comment.route.ts
└── index.ts
```

No `patches/` directory — every write is a single-table mutation plus an event,
which the service handles directly. Add `patches/` only if a future feature
(e.g. "merge thread") needs multi-aggregate orchestration.

---

## 3. Domain (`domain/model-comment.domain.ts`)

`ModelCommentEntity` is the Prisma row type re-exported from `#prisma/index`
(same pattern as `model-author`). The domain factory exposes:

- `createComment({ modelId, userId, parentCommentId?, body }): ModelCommentEntity`
  — assigns `id` (uuid), `createdAt = updatedAt = now`, `deletedAt = null`.
  Validates `body` length (1..10_000, trimmed) and throws
  `CommentBodyInvalidError` on failure. **Does not** sanitize or escape — body
  is stored as raw markdown.
- `assertNotDeleted(comment)` — throws `CommentDeletedError` if
  `comment.deletedAt !== null`. Used before mutations.
- `assertParentMatchesModel(parent, modelId)` — throws
  `ParentCommentMismatchError` when `parent.modelId !== modelId`. Prevents
  cross-model replies.
- `assertCanEdit(comment, callerId)` — throws `ForbiddenException` if
  `comment.userId !== callerId`. (For MVP, no time window — see Open Questions.)
- `assertCanDelete(comment, caller)` — author OR admin (`caller.systemRole ===
  'admin'`); otherwise `ForbiddenException`.

### Errors (`domain/model-comment.errors.ts`)

```ts
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '#src/shared/exceptions/index.ts';

export class CommentNotFoundError extends NotFoundException {
  constructor(id: string) { super(`Comment ${id} not found`); }
}
export class CommentDeletedError extends ConflictException {
  constructor(id: string) { super(`Comment ${id} is deleted`); }
}
export class CommentBodyInvalidError extends BadRequestException {
  constructor(reason: string) { super(`Invalid comment body: ${reason}`); }
}
export class ParentCommentMismatchError extends BadRequestException {
  constructor() { super('Parent comment belongs to a different model'); }
}
```

`assertCanEdit` / `assertCanDelete` reuse the shared `ForbiddenException` — no
new error class needed.

---

## 4. Repository

### Port (`database/model-comment.repository.port.ts`)

```ts
export interface ModelCommentRepository {
  findById(id: string): Promise<ModelCommentEntity | undefined>;
  findByIdTx(ctx: TransactionContext, id: string): Promise<ModelCommentEntity | undefined>;
  listByModelId(
    modelId: string,
    opts?: { includeDeleted?: boolean },
  ): Promise<ModelCommentEntity[]>;
  insertTx(ctx: TransactionContext, entity: ModelCommentEntity): Promise<void>;
  updateBodyTx(ctx: TransactionContext, id: string, body: string): Promise<void>;
  softDeleteTx(ctx: TransactionContext, id: string, at: Date): Promise<void>;
}
```

Notes:

- `listByModelId` returns a **flat** chronological list ordered by `createdAt
  asc`. The tree is assembled in the query layer (single Map pass) so the
  repository stays mechanical.
- `includeDeleted` defaults to `true` (we want tombstones for tree structure).
  Pass `false` only for admin "purge" tooling — not used by the public route.
- No pagination on the list yet. We expect modest comment volumes; if a single
  model crosses ~500 comments we revisit (see Open Questions §13).
- `softDeleteTx` sets `deletedAt = at` and `body = null` so the body text isn't
  recoverable from a stale dump. `userId` stays on the row — we still want
  moderation history to know who wrote it; the public projection nulls it.

### Mock (`database/model-comment.repository.mock.ts`)

Standard `vi.fn()` stubs for each port method, matching the `model-author`
mock pattern verbatim.

---

## 5. DTOs

### `create-comment.request.dto.ts`

```ts
import { Type, type Static } from 'typebox';

export const createCommentRequestDtoSchema = Type.Object({
  parentCommentId: Type.Optional(Type.String({ format: 'uuid' })),
  body: Type.String({ minLength: 1, maxLength: 10_000 }),
});
export type CreateCommentRequestDto = Static<typeof createCommentRequestDtoSchema>;
```

### `update-comment.request.dto.ts`

```ts
export const updateCommentRequestDtoSchema = Type.Object({
  body: Type.String({ minLength: 1, maxLength: 10_000 }),
});
export type UpdateCommentRequestDto = Static<typeof updateCommentRequestDtoSchema>;
```

### `comment.response.dto.ts`

Tombstone-friendly shape. `userId`, `body`, and `author` are nullable so the
tree can keep deleted nodes as structural placeholders.

```ts
export const commentAuthorDtoSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.Union([Type.String(), Type.Null()]),
  image: Type.Union([Type.String(), Type.Null()]),
});

export const commentResponseDtoSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  modelId: Type.String({ format: 'uuid' }),
  userId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  parentCommentId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  body: Type.Union([Type.String(), Type.Null()]),
  deletedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  author: Type.Union([commentAuthorDtoSchema, Type.Null()]),
});
export type CommentResponseDto = Static<typeof commentResponseDtoSchema>;
```

### `comment-tree.response.dto.ts` (recursive)

Typebox needs `Type.Recursive` (or `This`) for self-reference:

```ts
export const commentTreeNodeSchema = Type.Recursive((This) =>
  Type.Intersect([
    commentResponseDtoSchema,
    Type.Object({ replies: Type.Array(This) }),
  ]),
);
export type CommentTreeNode = Static<typeof commentTreeNodeSchema>;

export const commentTreeResponseDtoSchema = Type.Array(commentTreeNodeSchema);
```

The frontend renders deleted nodes from `deletedAt != null`; it never has to
guess from a missing `body`.

---

## 6. Routes (`model-comment.route.ts`)

| Method | Path                                  | Preauth                                    | Body / Params               | Response          |
|--------|---------------------------------------|--------------------------------------------|-----------------------------|-------------------|
| POST   | `/v1/models/:modelId/comments`        | `requireAuth`, `resolveModel('read')`      | `CreateCommentRequestDto`   | `201 { id }`      |
| GET    | `/v1/models/:modelId/comments`        | `resolveModel('read')`                     | —                           | `200 CommentTree` |
| PATCH  | `/v1/comments/:commentId`             | `requireAuth` (author only, checked in svc)| `UpdateCommentRequestDto`   | `204`             |
| DELETE | `/v1/comments/:commentId`             | `requireAuth` (author or admin, in svc)    | —                           | `204`             |

- POST nests under the model so the model existence + read-access check
  happens in `resolveModel` and `modelId` is never user-supplied in the body.
  Posting requires `requireAuth` plus `resolveModel('read')` — you can comment
  on any model you can see.
- PATCH/DELETE are flat on `/v1/comments/:commentId` because the comment row
  already knows its `modelId`; making the client supply both creates a chance
  for mismatch. The service loads the comment, then does the per-row
  authorization check (author or admin).
- 201 returns `{ id }` per `idDtoSchema`, matching `model-author` and every
  other create route.

Example schema wiring (the POST route):

```ts
fastify.post<{ Params: ModelIdParams; Body: CreateCommentRequestDto }>(
  '/v1/models/:modelId/comments',
  {
    schema: {
      params: modelIdParamsSchema,
      body: createCommentRequestDtoSchema,
      response: { 201: idDtoSchema },
      tags: ['Comment'],
    },
    preHandler: [requireAuth, resolveModel('read')],
  },
  async (request, reply) => {
    const { id } = await modelCommentService.create({
      modelId: request.params.modelId,
      userId: request.user!.id,
      parentCommentId: request.body.parentCommentId,
      body: request.body.body,
    });
    return reply.code(201).send({ id });
  },
);
```

Routes file mounts under the existing API plugin chain; nothing special.

---

## 7. Service (`model-comment.service.ts`)

Three public methods. Each follows the canonical
`transactionManager.run` + `eventRepository.insert` pattern. The notification
side-effect runs **after** commit via a post-commit hook (so SMTP latency or
failure can't roll back the write).

```ts
async create({ modelId, userId, parentCommentId, body }): Promise<{ id: string }> {
  if (parentCommentId) {
    const parent = await modelCommentRepository.findById(parentCommentId);
    if (!parent) throw new CommentNotFoundError(parentCommentId);
    modelCommentDomain.assertNotDeleted(parent);
    modelCommentDomain.assertParentMatchesModel(parent, modelId);
  }

  const entity = modelCommentDomain.createComment({ modelId, userId, parentCommentId, body });

  await transactionManager.run(async (ctx) => {
    await modelCommentRepository.insertTx(ctx, entity);
    await eventRepository.insert(ctx, {
      type: 'model_comment.created',
      actorId: userId,
      resourceType: 'model',
      resourceId: modelId,
      payload: { commentId: entity.id, parentCommentId: parentCommentId ?? null },
    });
  });

  queuePostCommit(() => notifyAuthorsOfNewComment(entity));
  return { id: entity.id };
}

async updateBody({ commentId, callerId, body }): Promise<void> {
  const comment = await modelCommentRepository.findById(commentId);
  if (!comment) throw new CommentNotFoundError(commentId);
  modelCommentDomain.assertNotDeleted(comment);
  modelCommentDomain.assertCanEdit(comment, callerId);
  if (body.trim().length === 0) throw new CommentBodyInvalidError('empty');

  await transactionManager.run(async (ctx) => {
    await modelCommentRepository.updateBodyTx(ctx, commentId, body);
    await eventRepository.insert(ctx, {
      type: 'model_comment.updated',
      actorId: callerId,
      resourceType: 'model',
      resourceId: comment.modelId,
      payload: { commentId },
    });
  });
}

async softDelete({ commentId, caller }): Promise<void> {
  const comment = await modelCommentRepository.findById(commentId);
  if (!comment) throw new CommentNotFoundError(commentId);
  modelCommentDomain.assertNotDeleted(comment);
  modelCommentDomain.assertCanDelete(comment, caller);

  const now = new Date();
  await transactionManager.run(async (ctx) => {
    await modelCommentRepository.softDeleteTx(ctx, commentId, now);
    await eventRepository.insert(ctx, {
      type: 'model_comment.deleted',
      actorId: caller.id,
      resourceType: 'model',
      resourceId: comment.modelId,
      payload: { commentId, byAdmin: caller.systemRole === 'admin' },
    });
  });
}
```

### Post-commit notification (`notifyAuthorsOfNewComment`)

```ts
async function notifyAuthorsOfNewComment(comment: ModelCommentEntity) {
  const authors = await modelAuthorRepository.findAllByModel(comment.modelId);
  const recipientIds = authors.map((a) => a.userId).filter((id) => id !== comment.userId);
  if (recipientIds.length === 0) return;

  const users = await userRepository.findManyByIds(recipientIds);
  const commenter = await userRepository.findById(comment.userId);

  const results = await Promise.allSettled(
    users.map(async (u) => {
      const content = `${commenter?.name ?? 'A user'} commented on your model.`;
      const unsubscribeUrl = buildUnsubscribeUrl(u.id);
      const mail = await mailDomain.createNotificationEmail(
        u.email!, u.name ?? 'there', content, unsubscribeUrl,
      );
      return mailService.sendMail(mail);
    }),
  );
  for (const r of results) {
    if (r.status === 'rejected') logger.warn({ err: r.reason }, 'comment notification failed');
  }
}
```

Notes:

- Use `Promise.allSettled` — one bad SMTP recipient must not abort the rest.
- Failures are logged, not retried inline. If durable retry matters later, push
  through pg-boss (`doc/pgboss-wiring-plan.md`) instead of inline.
- A dedicated `mailDomain.createNewCommentEmail(...)` factory is nicer copy
  than the generic notification template. **Marked as polish follow-up** — MVP
  uses `createNotificationEmail` as instructed.
- `queuePostCommit` can be implemented two ways:
  1. Trivial: call the function with `void notifyAuthorsOfNewComment(...)` after
     `transactionManager.run` returns (await success). Errors caught inside.
  2. Better: a small `postCommitHooks` array on the request context, drained in
     `onResponse`. Defer the abstraction until a second module needs it.

---

## 8. Queries (`queries/list-comments-tree.query.ts`)

```ts
export default function makeListCommentsTreeQuery({
  modelCommentRepository,
  modelCommentMapper,
}: Dependencies) {
  return {
    async execute({ modelId }: { modelId: string }): Promise<CommentTreeNode[]> {
      const flat = await modelCommentRepository.listByModelId(modelId, { includeDeleted: true });

      const byId = new Map<string, CommentTreeNode>();
      const roots: CommentTreeNode[] = [];

      for (const entity of flat) {
        const node: CommentTreeNode = {
          ...modelCommentMapper.toResponse(entity),
          replies: [],
        };
        byId.set(entity.id, node);
      }

      for (const entity of flat) {
        const node = byId.get(entity.id)!;
        if (entity.parentCommentId && byId.has(entity.parentCommentId)) {
          byId.get(entity.parentCommentId)!.replies.push(node);
        } else {
          roots.push(node);
        }
      }

      return roots;
    },
  };
}
```

The tombstone projection lives in `modelCommentMapper.toResponse`:

```ts
toResponse(entity: ModelCommentEntity): CommentResponseDto {
  const deleted = entity.deletedAt !== null;
  return {
    id: entity.id,
    modelId: entity.modelId,
    userId: deleted ? null : entity.userId,
    parentCommentId: entity.parentCommentId,
    body: deleted ? null : entity.body,
    deletedAt: entity.deletedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    author: deleted || !entity.user ? null : {
      id: entity.user.id,
      name: entity.user.name,
      image: entity.user.image,
    },
  };
}
```

To populate `author`, the repository's `listByModelId` should `include: { user:
{ select: { id: true, name: true, image: true } } }` in its Prisma call so the
mapper has the data without an N+1. (`findById` does the same.)

Tree depth is unbounded but the assembly is O(n) regardless. Frontend renders
recursively; if depth becomes a UX problem we visually flatten past N levels
without touching the API.

---

## 9. Event audit

Three new event types, all using the existing `Event` table:

| Type                     | actorId               | resourceType | resourceId | payload                                  |
|--------------------------|-----------------------|--------------|------------|------------------------------------------|
| `model_comment.created`  | comment author        | `model`      | modelId    | `{ commentId, parentCommentId \| null }` |
| `model_comment.updated`  | comment author        | `model`      | modelId    | `{ commentId }`                          |
| `model_comment.deleted`  | author or admin       | `model`      | modelId    | `{ commentId, byAdmin: boolean }`        |

`resourceType` is `model` (not `model_comment`) because admin filtering by
"everything that happened to model X" should naturally surface comment
activity. The `commentId` lives in the payload for cross-referencing.

No new `Event` columns or indexes.

---

## 10. Migrations

One Prisma migration: `add_model_comment`.

```
yarn prisma migrate dev --name add_model_comment
```

Generates:

- `CREATE TABLE "ModelComment" ...`
- FK constraints on `modelId`, `userId` (SetNull), `parentCommentId`
  (Cascade self-FK).
- Indexes: `(modelId, createdAt)`, `(parentCommentId)`, `(userId)`.

No data backfill — legacy postings aren't imported as part of this plan.
If/when the bulk legacy import runs, it will write through the same repository
and emit `model_comment.created` events with `actorId` = the original poster's
mapped user id. That's a separate import script, out of scope here.

---

## 11. Tests

### Unit

- `domain/model-comment.domain.spec.ts`
  - `createComment` builds a well-formed entity, trims trailing whitespace.
  - `createComment` throws `CommentBodyInvalidError` on empty / >10k / only
    whitespace.
  - `assertNotDeleted` throws on `deletedAt != null`.
  - `assertParentMatchesModel` throws on mismatched model id.
  - `assertCanEdit` allows author, denies others (admins included — edit is
    author-only).
  - `assertCanDelete` allows author and admin, denies other users.
- `model-comment.service.spec.ts` (mock repo + mock event repo + mock mail)
  - `create` writes row + event, calls notifier with model authors minus the
    commenter.
  - `create` with `parentCommentId` from a different model throws
    `ParentCommentMismatchError`.
  - `create` with a deleted parent throws `CommentDeletedError`.
  - `updateBody` by non-author throws `ForbiddenException`.
  - `updateBody` updates body + emits `model_comment.updated`.
  - `softDelete` by author succeeds, sets `deletedAt`, emits event.
  - `softDelete` by admin (non-author) succeeds, payload `byAdmin: true`.
  - `softDelete` by random user throws `ForbiddenException`.
  - Mail failure (mock `sendMail` rejects) does not throw out of `create`.

### Integration (`tests/integration/comment.test.ts`)

- POST `/v1/models/:id/comments` returns 201 + valid uuid; unauthenticated
  returns 401; reading a private model the caller can't see returns 404 (from
  `resolveModel`).
- POST a reply with `parentCommentId` from a different model returns 400.
- GET returns the tree; deleted nodes have `body=null, author=null,
  userId=null, deletedAt` set; structure preserved.
- PATCH by non-author returns 403; PATCH by author bumps `updatedAt` and
  changes body.
- DELETE by author soft-deletes (verify via subsequent GET tombstone shape);
  DELETE by admin works on someone else's comment; DELETE by random user 403.
- Email side-effect: capture `mailService.sendMail` mock — assert it was
  called once per non-commenter author, never for the commenter themselves.
- `Event` table contains one row per write with the expected `type`.

---

## 12. Out of scope

- Frontend rendering / sanitization / markdown pipeline.
- In-app notifications (UI bell). Email-only for MVP.
- @mentions, reactions, attachments, code blocks beyond what markdown gives.
- Pagination (revisit if a single model crosses ~500 comments).
- Bulk import of legacy `postings` rows.
- Q&A semantics (`is_question`, `answered_at`) — dropped permanently.
- Per-user "subscribe to thread" beyond model authorship — could be added
  later via a `ModelCommentSubscription` table.

---

## 13. Open questions

1. **Edit window.** MVP: edits allowed forever, `updatedAt` bumps. Better:
   author can edit within 15 minutes, after which the body is locked and only
   admin or soft-delete is available. 24 hours is a common middle ground. Need
   product input — recommend 15min as the default once UX is ready, because it
   prevents bait-and-switch edits to comments others have replied to.
2. **Pagination.** Trees over ~500 comments are slow to ship over the wire and
   ugly to render. Options when we cross that threshold:
   - Paginate top-level comments, eager-load up to N (e.g. 3) child replies per
     top-level, expose `GET /v1/comments/:id/replies` for the rest.
   - Cursor pagination on `(createdAt, id)` for top-level threads.
3. **Mentions.** When mentions arrive, the create flow needs to parse `@name`,
   resolve to users, and add them to the notification recipient list. Will need
   a separate `mentionDomain` to keep the regex / resolution logic isolated.
4. **Abuse / flagging.** Comments need a "report" link wired to the upcoming
   reporting module — see `[[legacy-migration-reporting-plan]]`. The
   `model-comment` module should expose `getById` so the reporting module can
   reference comments as resources without circular DI.
5. **Dedicated email template.** Polish item: add
   `mailDomain.createNewCommentEmail(userEmail, userName, modelTitle,
   commentSnippet, modelUrl, unsubscribeUrl)` and switch the notifier off the
   generic `createNotificationEmail`.
6. **Post-commit hook abstraction.** First module to need one. If the
   reporting module also wants post-commit side-effects, factor into
   `transactionManager` so it natively supports `ctx.onCommit(fn)`.
