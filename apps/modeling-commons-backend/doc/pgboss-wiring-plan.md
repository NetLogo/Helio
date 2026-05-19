# Wire pg-boss workers into server bootstrap

## Context

`pg-boss@^12.14.0` is installed and two worker modules exist (`src/workers/event-processor.ts`, `src/workers/model-draft-janitor.ts`) but neither is imported anywhere, so no queue or scheduled job actually runs. The janitor is required by the new `model-draft` module (purges drafts >90 days) and the event processor is the hook for async side-effects off the audit-event table. Both must start with the Fastify server and stop cleanly on shutdown.

## Approach

Start both workers from `src/server/index.ts` **after** `di(fastify)` runs (plugins autoload before DI, so a plugin can't resolve `eventRepository` / `modelDraftService` at register time). Attach the `PgBoss` instances to an `onClose` hook so SIGTERM/SIGINT in `src/index.ts` drains them gracefully.

### 1. Add an env flag to gate worker startup

File: `src/config/env.ts`

- Add `WORKERS_ENABLED: Type.Optional(Type.Boolean({ default: true }))` to the schema.
- Expose as `env.workers.enabled` in the derived config block near `env.db`.

Rationale: lets the test runner / CI / adminjs-only processes skip pg-boss without touching code. Defaults to on so dev and prod get workers by default.

### 2. New bootstrap helper: `src/workers/index.ts`

Create a single entrypoint that both composes the two existing `start*` functions and owns the shutdown hook:

```ts
// src/workers/index.ts
import type { FastifyInstance } from 'fastify';
import env from '#src/config/env.ts';
import { startEventProcessor } from '#src/workers/event-processor.ts';
import { startModelDraftJanitor } from '#src/workers/model-draft-janitor.ts';

export async function startWorkers(fastify: FastifyInstance): Promise<void> {
  if (!env.workers.enabled) {
    fastify.log.info('Workers disabled via WORKERS_ENABLED=false');
    return;
  }

  const { eventRepository, modelDraftService } = fastify.diContainer.cradle;
  const connectionString = env.db.url;

  const [eventBoss, janitorBoss] = await Promise.all([
    startEventProcessor({ connectionString, eventRepository, logger: fastify.log }),
    startModelDraftJanitor({ connectionString, modelDraftService, logger: fastify.log }),
  ]);

  fastify.addHook('onClose', async () => {
    fastify.log.info('Stopping pg-boss workers…');
    await Promise.allSettled([
      eventBoss.stop({ graceful: true }),
      janitorBoss.stop({ graceful: true }),
    ]);
  });
}
```

Reused as-is — no changes to the two existing `start*` function signatures; `diContainer.cradle` already exposes exactly what they need.

### 3. Call it from `src/server/index.ts`

Insert one line after `await di(fastify);` (currently line 57) and before the routes autoload:

```ts
await di(fastify);
await startWorkers(fastify);   // <-- new
await fastify.register(AutoLoad, { /* routes */ });
```

Placing it before routes means a hard failure in worker startup prevents the HTTP server from accepting traffic — preferable to a half-started process.

### 4. Event-processor queue needs a trigger

`event-processor.ts` calls `boss.work(QUEUE_NAME, …)` but never `boss.send` or `boss.schedule`, so the worker subscribes to a queue nothing publishes to. Two options; recommend **(a)** for now:

- **(a) Schedule it.** Add `await boss.schedule(QUEUE_NAME, '*/1 * * * *');` after the `boss.work(...)` call in `src/workers/event-processor.ts` so unprocessed events are drained every minute. Low-risk, matches the janitor pattern.
- (b) Publish from the transaction — requires plumbing `boss` into `eventRepository.insert` so every audit event also enqueues a job. More invasive; defer until we actually need sub-minute latency.

### 5. Shutdown ordering

`src/index.ts:30-33` already registers an `onClose` hook that `prisma.$disconnect()`s. Fastify runs `onClose` hooks in **reverse registration order**, so workers (registered inside `server(fastify)`) stop before Prisma disconnects — correct, since `boss.stop({ graceful: true })` waits for in-flight handlers that still use Prisma.

## Files touched

- `src/config/env.ts` — add `WORKERS_ENABLED` flag
- `src/workers/index.ts` — **new**, bootstrap + shutdown hook
- `src/workers/event-processor.ts` — add `boss.schedule(...)` call
- `src/server/index.ts` — call `startWorkers(fastify)` after `di(fastify)`

No DI-container registration needed: workers are started imperatively from the composition root, not resolved as services.

## Event Processing
The `event-processor` worker is the hook for async side-effects off the audit-event table. It runs a single queue, `event-processor`, which processes events in order of creation. The handler function is currently a no-op, but eventually will switch on `event.type` and trigger downstream effects (e.g. send notification email on `model.created`).

## Testing
Add spec testing for each worker. Add end-to-end test coverage for the event processor by inserting an unprocessed event into the `events` table and confirming the worker picks it up and updates `processedAt`.

## Verification

1. `yarn run deps:validate` — confirm no module-boundary violations from the new `src/workers/index.ts` imports.
2. `yarn tsc --noEmit` — type-check.
3. Boot locally (user runs, per CLAUDE.md "don't start dev servers"). Expect two log lines: `Event processor started` and `Model-draft janitor scheduled`. Then `select name, data from pgboss.job;` in Postgres to confirm both queue rows and the cron schedule exist.
4. Send `SIGTERM` to the dev process; logs should show `Stopping pg-boss workers…` then `Closing database connection…` in that order.
5. Insert a row into `events` with `processedAt = NULL`, wait ≤60s, confirm `processedAt` populated by the scheduled run.
6. Set `WORKERS_ENABLED=false`, reboot, confirm the startup log says workers disabled and no `pgboss.*` tables are touched on boot (pg-boss creates them on `boss.start()`).
