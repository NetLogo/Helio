import assert from 'node:assert';
import { After, Given, Then, When } from '@cucumber/cucumber';
import pg from 'pg';
import env from '#src/config/env.ts';
import realtimeConfig from '#src/config/realtime.ts';
import {
  modelCommentEventTypes,
  userNotificationEventTypes,
} from '#src/modules/event/domain/event-types.ts';
import type { StreamMessage } from '@repo/modeling-commons-shared';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';
import { formatRetryFrame } from '#src/shared/realtime/sse-frame.ts';
import { newId } from '#src/shared/utils/id.ts';
import {
  type EventStream,
  listenOnEphemeralPort,
  openEventStream,
  waitUntil,
} from '../support/event-stream.ts';
import { type RoleProcess, startRoleProcess } from '../support/role-process.ts';

const streamPath = '/api/v1/events';
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

When('an anonymous viewer opens an event stream', async function (this: ICustomWorld) {
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: streamPath,
  });
});

When(
  'a removed model stream is requested by {string}',
  async function (this: ICustomWorld, userName: string) {
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `${streamPath}/models/${newId()}`,
      headers: { cookie: getUser(this, userName).cookie },
    });
  },
);

When(
  '{string} opens an event stream from an allowed origin as {string}',
  async function (this: ICustomWorld, userName: string, label: string) {
    const origin = env.cors.allowedOrigins[0];
    assert.ok(origin, 'no allowed origin is configured');
    this.context['streamOrigin'] = origin;
    await openStream(this, label, streamPath, {
      cookie: getUser(this, userName).cookie,
      origin,
    });
  },
);

Given(
  '{string} opens an event stream as {string}',
  async function (this: ICustomWorld, userName: string, label: string) {
    await openStream(this, label, streamPath, {
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

async function notifyRealtimeChannel(message: StreamMessage): Promise<void> {
  await withDatabaseClient((client) =>
    client.query('SELECT pg_notify($1, $2)', [realtimeConfig.channel, JSON.stringify(message)]),
  );
}

When(
  'the realtime channel is notified of a comment on {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    await notifyRealtimeChannel({
      topic: { type: 'model', id: getModelId(this, modelTitle) },
      event: modelCommentEventTypes.created,
    });
  },
);

When(
  'the realtime channel is notified of a notification for {string}',
  async function (this: ICustomWorld, userName: string) {
    await notifyRealtimeChannel({
      topic: { type: 'user', id: getUser(this, userName).id },
      event: userNotificationEventTypes.created,
    });
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

const subscriptionsPath = '/api/v1/events/subscriptions';

function getConnectionId(world: ICustomWorld, label: string): string {
  const connection = getStream(world, label)
    .listMessages()
    .find((message) => message.event === 'connection');
  assert.ok(
    typeof connection?.connectionId === 'string',
    `stream "${label}" sent no connection id`,
  );
  return connection.connectionId;
}

async function sendSubscription(
  world: ICustomWorld,
  method: 'POST' | 'DELETE',
  userName: string,
  payload: { connectionId: string; topic: { type: string; id: string } },
): Promise<void> {
  world.context.latestResponse = await world.server.inject({
    method,
    url: subscriptionsPath,
    headers: { cookie: getUser(world, userName).cookie },
    payload,
  });
}

function countTopicEvents(world: ICustomWorld, label: string, modelId: string): number {
  return getStream(world, label)
    .listMessages()
    .filter((message) => message.topic?.type === 'model' && message.topic.id === modelId).length;
}

Then(
  'the {string} and {string} streams should carry different connection ids',
  function (this: ICustomWorld, first: string, second: string) {
    assert.notStrictEqual(getConnectionId(this, first), getConnectionId(this, second));
  },
);

Then(
  'the first message on the {string} stream should be its connection message',
  function (this: ICustomWorld, label: string) {
    const [first] = getStream(this, label).listMessages();
    assert.strictEqual(first?.event, 'connection');
    assert.strictEqual(typeof first.connectionId, 'string');
  },
);

When(
  '{string} subscribes the {string} stream to model {string}',
  async function (this: ICustomWorld, userName: string, label: string, modelTitle: string) {
    await sendSubscription(this, 'POST', userName, {
      connectionId: getConnectionId(this, label),
      topic: { type: 'model', id: getModelId(this, modelTitle) },
    });
  },
);

When(
  '{string} unsubscribes the {string} stream from model {string}',
  async function (this: ICustomWorld, userName: string, label: string, modelTitle: string) {
    await sendSubscription(this, 'DELETE', userName, {
      connectionId: getConnectionId(this, label),
      topic: { type: 'model', id: getModelId(this, modelTitle) },
    });
  },
);

When(
  '{string} subscribes the {string} stream to a model that does not exist',
  async function (this: ICustomWorld, userName: string, label: string) {
    await sendSubscription(this, 'POST', userName, {
      connectionId: getConnectionId(this, label),
      topic: { type: 'model', id: newId() },
    });
  },
);

When(
  '{string} subscribes the {string} stream to the user topic of {string}',
  async function (this: ICustomWorld, userName: string, label: string, topicUserName: string) {
    await sendSubscription(this, 'POST', userName, {
      connectionId: getConnectionId(this, label),
      topic: { type: 'user', id: getUser(this, topicUserName).id },
    });
  },
);

When(
  '{string} subscribes the {string} stream to a {string} topic',
  async function (this: ICustomWorld, userName: string, label: string, topicType: string) {
    await sendSubscription(this, 'POST', userName, {
      connectionId: getConnectionId(this, label),
      topic: { type: topicType, id: newId() },
    });
  },
);

When(
  '{string} subscribes an unknown connection to model {string}',
  async function (this: ICustomWorld, userName: string, modelTitle: string) {
    await sendSubscription(this, 'POST', userName, {
      connectionId: newId(),
      topic: { type: 'model', id: getModelId(this, modelTitle) },
    });
  },
);

Then(
  'the {string} stream should carry {int} event(s) for model {string} within {int} seconds',
  async function (
    this: ICustomWorld,
    label: string,
    count: number,
    modelTitle: string,
    seconds: number,
  ) {
    const modelId = getModelId(this, modelTitle);
    await waitUntil(() => countTopicEvents(this, label, modelId) >= count, seconds * 1000);
    assert.strictEqual(
      countTopicEvents(this, label, modelId),
      count,
      getStream(this, label).received(),
    );
  },
);

Then(
  'the {string} stream should carry no event for model {string}',
  function (this: ICustomWorld, label: string, modelTitle: string) {
    const modelId = getModelId(this, modelTitle);
    assert.strictEqual(
      countTopicEvents(this, label, modelId),
      0,
      getStream(this, label).received(),
    );
  },
);

Given(
  '{string} opens an event stream subscribed to model {string} as {string}',
  async function (this: ICustomWorld, userName: string, modelTitle: string, label: string) {
    await openStream(this, label, streamPath, { cookie: getUser(this, userName).cookie });
    await sendSubscription(this, 'POST', userName, {
      connectionId: getConnectionId(this, label),
      topic: { type: 'model', id: getModelId(this, modelTitle) },
    });
    assert.strictEqual(this.context.latestResponse?.statusCode, 204);
  },
);

Given(
  '{string} opens an event stream subscribed to their notifications as {string}',
  async function (this: ICustomWorld, userName: string, label: string) {
    await openStream(this, label, streamPath, { cookie: getUser(this, userName).cookie });
    await sendSubscription(this, 'POST', userName, {
      connectionId: getConnectionId(this, label),
      topic: { type: 'user', id: getUser(this, userName).id },
    });
    assert.strictEqual(this.context.latestResponse?.statusCode, 204);
  },
);
