import assert from 'node:assert';
import { After, Given, Then, When } from '@cucumber/cucumber';
import pg from 'pg';
import env from '#src/config/env.ts';
import realtimeConfig from '#src/config/realtime.ts';
import { modelCommentEventTypes } from '#src/modules/event/domain/event-types.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';
import { formatRetryFrame } from '#src/shared/realtime/sse-frame.ts';
import {
  type EventStream,
  listenOnEphemeralPort,
  openEventStream,
  waitUntil,
} from '../support/event-stream.ts';
import { type RoleProcess, startRoleProcess } from '../support/role-process.ts';

const notificationStreamPath = '/api/v1/events';
const modelStreamPath = (modelId: string) => `/api/v1/events/models/${modelId}`;
const roleProcessStartTimeoutMs = 30_000;

function getUser(world: ICustomWorld, name: string): TestUser {
  const user = (world.context['users'] as Map<string, TestUser> | undefined)?.get(name);
  assert.ok(user, `no user "${name}"`);
  return user;
}

function getModelId(world: ICustomWorld, title: string): string {
  const id = (world.context['models'] as Map<string, string> | undefined)?.get(title);
  assert.ok(id, `no model "${title}"`);
  return id;
}

function getStreams(world: ICustomWorld): Map<string, EventStream> {
  if (!world.context['eventStreams'])
    world.context['eventStreams'] = new Map<string, EventStream>();
  return world.context['eventStreams'] as Map<string, EventStream>;
}

function getStream(world: ICustomWorld, label: string): EventStream {
  const stream = getStreams(world).get(label);
  assert.ok(stream, `no stream "${label}"`);
  return stream;
}

async function openStream(
  world: ICustomWorld,
  label: string,
  path: string,
  headers: Record<string, string>,
): Promise<EventStream> {
  const port = await listenOnEphemeralPort(world.server);
  const stream = await openEventStream(port, path, headers);
  getStreams(world).set(label, stream);
  assert.strictEqual(stream.statusCode, 200, `stream "${label}" answered ${stream.statusCode}`);
  assert.ok(
    await waitUntil(() => stream.received().includes(': open'), 5000),
    `stream "${label}" sent no opening frame`,
  );
  return stream;
}

async function withDatabaseClient<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: env.db.url });
  await client.connect();
  return run(client).finally(() => client.end());
}

async function countListenerConnections(): Promise<number> {
  return withDatabaseClient(async (client) => {
    const { rows } = await client.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name = $1 AND datname = current_database()',
      [realtimeConfig.listener.applicationName],
    );
    return rows[0]?.count ?? 0;
  });
}

type MutableStreamSettings = { maxStreamLifetimeMs: number };

const defaultMaxStreamLifetimeMs = realtimeConfig.streams.maxStreamLifetimeMs;

function setMaxStreamLifetimeMs(lifetimeMs: number) {
  (realtimeConfig.streams as MutableStreamSettings).maxStreamLifetimeMs = lifetimeMs;
}

After({ tags: '@realtime' }, async function (this: ICustomWorld) {
  setMaxStreamLifetimeMs(defaultMaxStreamLifetimeMs);
  for (const stream of getStreams(this).values()) stream.close();
  await (this.context['roleProcess'] as RoleProcess | undefined)?.stop();
});

Given('event streams are capped at {int} milliseconds', function (lifetimeMs: number) {
  setMaxStreamLifetimeMs(lifetimeMs);
});

Then(
  'the {string} stream should end with the closing retry hint within {int} seconds',
  async function (this: ICustomWorld, label: string, seconds: number) {
    const stream = getStream(this, label);
    assert.ok(await waitUntil(stream.ended, seconds * 1000), `stream "${label}" is still open`);
    assert.ok(
      stream.received().endsWith(formatRetryFrame(realtimeConfig.streams.closingRetryMs)),
      stream.received(),
    );
  },
);

When('an anonymous viewer opens the notification stream', async function (this: ICustomWorld) {
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: notificationStreamPath,
  });
});

When(
  '{string} opens the stream of model {string} and lists its comments',
  async function (this: ICustomWorld, userName: string, modelTitle: string) {
    const { cookie } = getUser(this, userName);
    const modelId = getModelId(this, modelTitle);
    const [stream, comments] = await Promise.all([
      this.server.inject({ method: 'GET', url: modelStreamPath(modelId), headers: { cookie } }),
      this.server.inject({
        method: 'GET',
        url: `/api/v1/models/${modelId}/comments`,
        headers: { cookie },
      }),
    ]);
    this.context['streamStatus'] = stream.statusCode;
    this.context['commentsStatus'] = comments.statusCode;
  },
);

Then(
  'both answers should have the same status, and it should not be 200',
  function (this: ICustomWorld) {
    assert.notStrictEqual(this.context['commentsStatus'], 200);
    assert.strictEqual(this.context['streamStatus'], this.context['commentsStatus']);
  },
);

When(
  '{string} opens the notification stream from an allowed origin as {string}',
  async function (this: ICustomWorld, userName: string, label: string) {
    const origin = env.cors.allowedOrigins[0];
    assert.ok(origin, 'no allowed origin is configured');
    this.context['streamOrigin'] = origin;
    await openStream(this, label, notificationStreamPath, {
      cookie: getUser(this, userName).cookie,
      origin,
    });
  },
);

Given(
  '{string} opens the notification stream as {string}',
  async function (this: ICustomWorld, userName: string, label: string) {
    await openStream(this, label, notificationStreamPath, {
      cookie: getUser(this, userName).cookie,
    });
  },
);

Given(
  '{string} opens the stream of model {string} as {string}',
  async function (this: ICustomWorld, userName: string, modelTitle: string, label: string) {
    await openStream(this, label, modelStreamPath(getModelId(this, modelTitle)), {
      cookie: getUser(this, userName).cookie,
    });
  },
);

Then(
  'the {string} stream should answer 200 as an uncompressed, unbuffered event stream',
  function (this: ICustomWorld, label: string) {
    const { statusCode, headers } = getStream(this, label);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(headers['content-type'], 'text/event-stream');
    assert.strictEqual(headers['cache-control'], 'no-cache, no-transform');
    assert.strictEqual(headers['x-accel-buffering'], 'no');
    assert.strictEqual(headers['content-encoding'], undefined);
  },
);

Then(
  'the {string} stream should allow that origin with credentials',
  function (this: ICustomWorld, label: string) {
    const { headers } = getStream(this, label);
    assert.strictEqual(headers['access-control-allow-origin'], this.context['streamOrigin']);
    assert.strictEqual(headers['access-control-allow-credentials'], 'true');
  },
);

Then(
  'the {string} stream should carry no connection header',
  function (this: ICustomWorld, label: string) {
    assert.strictEqual(getStream(this, label).headers['connection'], undefined);
  },
);

Then(
  'the {string} stream should start with the retry delay and an open comment',
  function (this: ICustomWorld, label: string) {
    assert.ok(
      getStream(this, label)
        .received()
        .startsWith(`retry: ${realtimeConfig.streams.clientRetryMs}\n\n: open\n\n`),
    );
  },
);

Then(
  'the {string} stream should carry {int} {string} event(s) within {int} seconds',
  async function (
    this: ICustomWorld,
    label: string,
    count: number,
    event: string,
    seconds: number,
  ) {
    const stream = getStream(this, label);
    await waitUntil(() => stream.countEvents(event) >= count, seconds * 1000);
    assert.strictEqual(stream.countEvents(event), count, stream.received());
  },
);

Then(
  'the {string} stream should carry no {string} event',
  function (this: ICustomWorld, label: string, event: string) {
    const stream = getStream(this, label);
    assert.strictEqual(stream.countEvents(event), 0, stream.received());
  },
);

When(
  'a comment by {string} on {string} is written in a transaction that rolls back',
  async function (this: ICustomWorld, userName: string, modelTitle: string) {
    const { transactionManager, modelCommentRepository, modelCommentDomain, eventRepository } =
      this.server.diContainer.cradle;
    const user = getUser(this, userName);
    const modelId = getModelId(this, modelTitle);
    const comment = modelCommentDomain.createComment({
      modelId,
      userId: user.id,
      content: 'Rolled back',
    });
    const rollback = new Error('roll back the comment');
    await assert.rejects(
      transactionManager.run(async (ctx) => {
        await modelCommentRepository.insertTx(ctx, comment);
        await eventRepository.insertTx(ctx, {
          type: modelCommentEventTypes.created,
          actorId: user.id,
          resourceType: 'model',
          resourceId: modelId,
          payload: { commentId: comment.id, parentId: null },
        });
        throw rollback;
      }),
      rollback,
    );
  },
);

When(
  'the model channel is notified with the id of {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const modelId = getModelId(this, modelTitle);
    await withDatabaseClient((client) =>
      client.query('SELECT pg_notify($1, $2)', [realtimeConfig.channels.model, modelId]),
    );
  },
);

When(
  'the user channel is notified with the id of {string}',
  async function (this: ICustomWorld, userName: string) {
    const { id } = getUser(this, userName);
    await withDatabaseClient((client) =>
      client.query('SELECT pg_notify($1, $2)', [realtimeConfig.channels.user, id]),
    );
  },
);

When(
  "the realtime listener's database connection is terminated",
  async function (this: ICustomWorld) {
    const terminated = await withDatabaseClient(async (client) => {
      const { rows } = await client.query<{ terminated: boolean }>(
        'SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE application_name = $1 AND datname = current_database()',
        [realtimeConfig.listener.applicationName],
      );
      return rows;
    });
    assert.deepStrictEqual(terminated, [{ terminated: true }]);
  },
);

Given('the realtime listener connections are counted', async function (this: ICustomWorld) {
  this.context['listenerBaseline'] = await countListenerConnections();
});

When('an {string} role process is started', async function (this: ICustomWorld, role: string) {
  this.context['roleProcess'] = await startRoleProcess(role, roleProcessStartTimeoutMs);
});

function getRoleProcess(world: ICustomWorld): RoleProcess {
  const roleProcess = world.context['roleProcess'] as RoleProcess | undefined;
  assert.ok(roleProcess, 'no role process was started');
  return roleProcess;
}

Then(
  'the role process should answer {int} for {string}',
  async function (this: ICustomWorld, status: number, path: string) {
    const { port } = getRoleProcess(this);
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    await response.body?.cancel();
    assert.strictEqual(response.status, status, path);
  },
);

Then(
  'the role process should have logged that workers are disabled',
  function (this: ICustomWorld) {
    assert.match(getRoleProcess(this).output(), /Workers are disabled by configuration/);
  },
);

Then(
  'the role process should hold {int} realtime listener connection(s) within {int} seconds',
  async function (this: ICustomWorld, count: number, seconds: number) {
    const expected = (this.context['listenerBaseline'] as number) + count;
    await waitUntil(async () => (await countListenerConnections()) === expected, seconds * 1000);
    assert.strictEqual(await countListenerConnections(), expected);
  },
);

Then(
  'the role process should hold {int} realtime listener connection(s)',
  async function (this: ICustomWorld, count: number) {
    const expected = (this.context['listenerBaseline'] as number) + count;
    assert.strictEqual(await countListenerConnections(), expected);
  },
);
