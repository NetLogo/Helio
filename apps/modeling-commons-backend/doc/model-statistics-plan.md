# Model Statistics Plan

Adds likes, views, runs, downloads, and shares to models.

## Two concerns, two tables

1. **Likes** — stateful toggle per `(modelId, userId)`. Unique, idempotent, reversible. Frontend consumes count only.
2. **Views / runs / downloads / shares** — append-only activity log. High write volume, anonymous allowed, used for counts + analytics.

The existing `Event` table is the admin/domain audit log (`actorId` required). Do not use it as the analytics firehose — keep it focused and add a dedicated `ModelInteraction` table whose indexes serve hot read paths (counts by model).

## Schema (`prisma/schema.prisma`)

```prisma
enum ModelInteractionKind {
  view
  run
  download
  share
}

model ModelLike {
  modelId   String
  userId    String
  createdAt DateTime @default(now()) @db.Timestamptz(3)

  model Model @relation(fields: [modelId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([modelId, userId])
  @@index([userId])
  @@index([modelId, createdAt])
}

model ModelInteraction {
  id            String               @id @default(uuid())
  modelId       String
  versionNumber Int?
  kind          ModelInteractionKind
  userId        String?              // null = anonymous
  sessionId     String?              // better-auth session id, for dedupe
  ipHash        String?              // sha256(ip + daily salt) — NOT raw IP (PII)
  userAgent     String?              // truncated
  referer       String?
  geo           Json?                // e.g. { country: 'US', region: 'CA', city: 'San Francisco' }
  cookie        String?              // single-browser, cross-session, cross-user, cross-IP dedupe key

  createdAt     DateTime             @default(now()) @db.Timestamptz(3)

  model Model @relation(fields: [modelId], references: [id], onDelete: Cascade)
  user  User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([modelId, kind, createdAt])
  @@index([modelId, kind, userId])
  @@index([userId, createdAt])
  @@index([createdAt])
}
```

Optional, deferred until interaction row count hurts:

```prisma
model ModelStatsDaily {
  modelId     String
  kind        ModelInteractionKind
  day         DateTime @db.Date
  count       Int
  uniqueCount Int
  @@id([modelId, kind, day])
  @@index([modelId, kind])
}
```

One migration: the enum, both tables, new back-relations on `User` and `Model`.

## Modules (DDD — mirror existing `event` / `model` layout)

### `src/modules/model-like/`

- `domain/` — errors, like aggregate shape.
- `database/model-like.repository.{ts,port.ts,mock.ts}` — `upsert`, `delete`, `countByModel`, `existsFor(modelId, userId)`.
- `model-like.service.ts` — `like` / `unlike`; both idempotent. Emit `model.liked` / `model.unliked` through existing `eventRepository` (audit stream, not counts).
- `model-like.route.ts`:
  - `POST   /v1/models/:id/like`   → 204 (idempotent)
  - `DELETE /v1/models/:id/like`   → 204 (idempotent)
  - `GET    /v1/models/:id/likes`  → `{ count, likedByMe }`

### `src/modules/model-interaction/`

- `domain/model-interaction.types.ts` — kind enum mirror, `ClientContext` type.
- `database/model-interaction.repository.{ts,port.ts,mock.ts}` — `insert`, `countByModelAndKind`, `countsByKindForModel(modelId): Record<kind, number>`, `countsForModels(ids[])`.
- `model-interaction.service.ts` — `record(kind, modelId, ctx)`; resolves before response (no background queue in v1).
- `model-interaction.route.ts`:
  - `POST /v1/models/:id/views`
  - `POST /v1/models/:id/runs`
  - `POST /v1/models/:id/downloads`
  - `POST /v1/models/:id/shares`
  - `GET /v1/models/:id/interactions`  -> `{ likes, views, runs, downloads, shares, likedByMe }`

  Optional body `{ versionNumber?: number }`. Auth optional — do not require.

## Read path

Extend `getModelCardQuery` to include `{ likes, views, runs, downloads, shares, likedByMe }`. Three queries per card:

```sql
SELECT kind, COUNT(*) FROM "ModelInteraction"
WHERE "modelId" = $1 GROUP BY kind;
```

Plus like count and `likedByMe`. Acceptable for now.


## Shared infrastructure

### `src/shared/http/client-context.ts` (new)

```ts
export function getClientIp(req: FastifyRequest): string {
  return (
    env.server.ipAddressHeaders
      .map(h => req.headers[h] as string | undefined)
      .find(Boolean)
      ?.split(',')[0]
      .trim() ?? req.ip
  );
}

export function generateUniqueId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function getClientContext(req: FastifyRequest): ClientContext {
  return {
    userId:    req.user?.id ?? null,
    sessionId: req.session?.id ?? null,
    ipHash:    hashIp(getClientIp(req)),
    userAgent: (req.headers['user-agent'] ?? '').slice(0, 512),
    referer:   (req.headers['referer']    ?? '').slice(0, 512),
    cookie:    (req.cookies['_mc_uid'] ?? '').slice(0, 64),
  };
}

```

Refactor `src/server/plugins/rate-limit.ts` to call `getClientIp`.

Add global middleware to send `_mc_uid` cookie if not present (generate random value, 1-year expiry).
Enables cross-session dedup without login.

### IP hashing

`hashIp = sha256(ip + DAILY_SALT).slice(0, 32)` — daily salt rotation prevents cross-day correlation and reversal. Raw IPs are PII under GDPR/CCPA. Same-day uniqueness still computable. Matches Plausible / Fathom / anonymized Matomo.

Add `IP_HASH_SALT` env var (or derive daily from a base secret).

## Abuse / dedup guards

- **Views**: drop duplicates from `(modelId, userId|ipHash, sessionId)` within a 30-min window. Cheapest impl: pre-insert query of most-recent row; or Redis `SETEX view:{modelId}:{key} 1800`. Also rate-limit interaction routes via existing `@fastify/rate-limit` (~60/min/key).
- **Runs / downloads / shares**: no dedup — each is a real action.
- **Self-interactions by authors**: include (industry default — GitHub, YouTube). Expose `excludeAuthors` filter later if needed.

## Event table

Keep for domain audit. Write `model.liked` / `model.unliked` there. **Do not** write a row per view — that's what `ModelInteraction` is for.

## DI / wiring

Register repositories + services in `src/modules/index.ts` (awilix). Mount routes where other modules register. Use the `repository.port.ts` + `repository.mock.ts` split for tests.

## Out of scope (v1)

- `ModelStatsDaily` rollup worker — add when interactions exceed ~10M rows.
- Geo enrichment from IP.
- Public analytics dashboard.
- Server-issued share tokens (attribution). v1 = client-initiated beacon.

## Resolved decisions

- **Likes require auth.** Count-as-aggregate model; matches GitHub.
- **Interactions allow anonymous.** `userId` nullable.
- **User deletion**: `ModelInteraction.userId` → null (preserves counts); `ModelLike` cascades (count drops). Matches GDPR erasure.
- **Share tracking**: client beacon only in v1.
