import assert from 'node:assert';
import { Before, Given, Then, When } from '@cucumber/cucumber';
import workersConfig from '#src/config/workers.ts';
import { modelCommentEventTypes } from '#src/modules/event/domain/event-types.ts';
import makeBoss from '#src/shared/jobs/boss.ts';
import makePgBossJobQueue from '#src/shared/jobs/pg-boss.job-queue.ts';
import { newId } from '#src/shared/utils/id.ts';
import {
  listSubscriberEntries,
  registerSendQueues,
  registerSubscriptions,
} from '#src/workers/queues.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import { emailDeadLetterQueueName, emailQueueName } from '../support/email-jobs.ts';

const probeQueue = 'e2e-job-queue-probe';
const probeEvent = 'e2e.probe_published';
const probeSubscriberQueues = ['e2e-publish-probe-a', 'e2e-publish-probe-b'];

Before({ tags: '@job-queue' }, async function (this: ICustomWorld) {
  const { boss } = this.server.diContainer.cradle;
  await boss.createQueue(probeQueue);
  for (const queueName of probeSubscriberQueues) {
    await boss.createQueue(queueName);
    await boss.subscribe(probeEvent, queueName);
  }
});

When('a probe job is sent inside a transaction that commits', async function (this: ICustomWorld) {
  const { jobQueue, transactionManager } = this.server.diContainer.cradle;
  this.context['probeJobId'] = await transactionManager.run(async (ctx) =>
    jobQueue.sendTx(ctx, probeQueue, { probe: 'commit' }),
  );
});

When(
  'a probe job is sent inside a transaction that rolls back',
  async function (this: ICustomWorld) {
    const { jobQueue, transactionManager } = this.server.diContainer.cradle;
    const rollback = new Error('roll back the probe transaction');
    await assert.rejects(
      transactionManager.run(async (ctx) => {
        this.context['probeJobId'] = await jobQueue.sendTx(ctx, probeQueue, { probe: 'rollback' });
        throw rollback;
      }),
      rollback,
    );
  },
);

When('a probe job is sent outside a transaction', async function (this: ICustomWorld) {
  const { jobQueue } = this.server.diContainer.cradle;
  this.context['probeJobId'] = await jobQueue.send(probeQueue, { probe: 'plain' });
});

Then('the probe job should exist', async function (this: ICustomWorld) {
  const id = this.context['probeJobId'] as string;
  assert.ok(id, 'the send returned no job id');
  const job = await this.server.diContainer.cradle.boss.getJobById(probeQueue, id);
  assert.notStrictEqual(job, null);
});

Then('the probe job should not exist', async function (this: ICustomWorld) {
  const id = this.context['probeJobId'] as string;
  assert.ok(id, 'the send returned no job id');
  const job = await this.server.diContainer.cradle.boss.getJobById(probeQueue, id);
  assert.strictEqual(job, null);
});

Given('the send-email queue does not exist', async function (this: ICustomWorld) {
  const { boss } = this.server.diContainer.cradle;
  await boss.deleteQueue(emailQueueName);
  await boss.deleteQueue(emailDeadLetterQueueName);
  assert.strictEqual(await boss.getQueue(emailQueueName), null);
});

When(
  'an api-role boss sends one email job plainly and one inside a committed transaction',
  async function (this: ICustomWorld) {
    const { logger, transactionManager } = this.server.diContainer.cradle;
    const apiBoss = makeBoss({ logger, workersEnabled: false });
    const apiJobQueue = makePgBossJobQueue({ boss: apiBoss, logger });
    const probeEmail = { to: 'api-role-probe@example.test', subject: 'api-role probe' };
    const sendBoth = async () => {
      await apiBoss.start();
      await registerSendQueues(apiBoss);
      const plainId = await apiJobQueue.send(emailQueueName, { ...probeEmail, text: 'plain' });
      const txId = await transactionManager.run(async (ctx) =>
        apiJobQueue.sendTx(ctx, emailQueueName, { ...probeEmail, text: 'tx' }),
      );
      return [plainId, txId];
    };
    this.context['apiProbeJobIds'] = await sendBoth().finally(async () =>
      apiBoss.stop({ graceful: true }),
    );
  },
);

Then('both api-role email jobs should exist', async function (this: ICustomWorld) {
  const ids = this.context['apiProbeJobIds'] as Array<string | null>;
  const { boss } = this.server.diContainer.cradle;
  assert.strictEqual(ids.length, 2);
  for (const id of ids) {
    assert.ok(id, 'the api-role send returned no job id');
    assert.notStrictEqual(await boss.getJobById(emailQueueName, id), null);
  }
});

const freshSchema = 'pgboss_e2e_api_first';

Given('a pg-boss schema that has never been installed', async function (this: ICustomWorld) {
  const { db } = this.server.diContainer.cradle;
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${freshSchema} CASCADE`);
});

When(
  'an api-role boss starts on it and sends a probe email job',
  async function (this: ICustomWorld) {
    const { logger } = this.server.diContainer.cradle;
    const apiBoss = makeBoss({ logger, workersEnabled: false, schema: freshSchema });
    const sendProbe = async () => {
      await apiBoss.start();
      await registerSendQueues(apiBoss);
      const id = await makePgBossJobQueue({ boss: apiBoss, logger }).send(emailQueueName, {
        to: 'api-first-probe@example.test',
        subject: 'api-first probe',
      });
      return { id, found: id ? await apiBoss.getJobById(emailQueueName, id) : null };
    };
    this.context['apiFirstProbe'] = await sendProbe().finally(async () => {
      await apiBoss.stop({ graceful: true });
      await this.server.diContainer.cradle.db.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS ${freshSchema} CASCADE`,
      );
    });
  },
);

Then('the probe email job should exist in that schema', function (this: ICustomWorld) {
  const probe = this.context['apiFirstProbe'] as { id: string | null; found: unknown };
  assert.ok(probe.id, 'the api-role send returned no job id');
  assert.notStrictEqual(probe.found, null);
});

async function publishProbe(world: ICustomWorld, commits: boolean): Promise<void> {
  const { jobQueue, transactionManager } = world.server.diContainer.cradle;
  const marker = newId();
  world.context['publishMarker'] = marker;
  const rollback = new Error('roll back the probe publish');
  const publish = transactionManager.run(async (ctx) => {
    await jobQueue.publishTx(ctx, probeEvent, { marker });
    if (!commits) throw rollback;
  });
  if (commits) await publish;
  else await assert.rejects(publish, rollback);
}

When(
  'a probe event is published inside a transaction that commits',
  async function (this: ICustomWorld) {
    await publishProbe(this, true);
  },
);

When(
  'a probe event is published inside a transaction that rolls back',
  async function (this: ICustomWorld) {
    await publishProbe(this, false);
  },
);

When(
  'an event nobody subscribes to is published inside a transaction that commits',
  async function (this: ICustomWorld) {
    const { jobQueue, transactionManager } = this.server.diContainer.cradle;
    const marker = newId();
    this.context['publishMarker'] = marker;
    this.context['publishedJobIds'] = await transactionManager.run(async (ctx) =>
      jobQueue.publishTx(ctx, 'e2e.nobody_listens', { marker }),
    );
  },
);

Then(
  'each probe subscriber queue should hold {int} job(s) for that publish',
  async function (this: ICustomWorld, count: number) {
    const { jobQueue } = this.server.diContainer.cradle;
    const marker = this.context['publishMarker'] as string;
    const rows = await jobQueue.findJobStates(probeSubscriberQueues, 'marker', [marker]);
    for (const queueName of probeSubscriberQueues) {
      assert.strictEqual(rows.filter((row) => row.queue === queueName).length, count, queueName);
    }
  },
);

Then('the publish should have created no job', async function (this: ICustomWorld) {
  const { db } = this.server.diContainer.cradle;
  const marker = this.context['publishMarker'] as string;
  assert.deepStrictEqual(this.context['publishedJobIds'], []);
  const rows = await db.$queryRawUnsafe<Array<unknown>>(
    `SELECT id FROM ${workersConfig.schema}.job WHERE data->>'marker' = $1`,
    marker,
  );
  assert.strictEqual(rows.length, 0);
});

Given('the pg-boss subscription table is empty', async function (this: ICustomWorld) {
  const { db } = this.server.diContainer.cradle;
  await db.$executeRawUnsafe(`DELETE FROM ${workersConfig.schema}.subscription`);
});

When(
  'an api-role boss starts and registers the subscriptions',
  async function (this: ICustomWorld) {
    const { logger } = this.server.diContainer.cradle;
    const apiBoss = makeBoss({ logger, workersEnabled: false });
    const register = async () => {
      await apiBoss.start();
      await registerSubscriptions(apiBoss);
    };
    await register().finally(async () => apiBoss.stop({ graceful: true }));
  },
);

Then('every configured subscription should exist', async function (this: ICustomWorld) {
  const { db } = this.server.diContainer.cradle;
  const rows = await db.$queryRawUnsafe<Array<{ event: string; name: string }>>(
    `SELECT event, name FROM ${workersConfig.schema}.subscription`,
  );
  const actual = new Set(rows.map((row) => `${row.event} -> ${row.name}`));
  const expected = listSubscriberEntries().flatMap(({ queueName, subscribesTo }) =>
    subscribesTo.map((eventType) => `${eventType} -> ${queueName}`),
  );
  assert.ok(expected.length > 0);
  for (const pair of expected) assert.ok(actual.has(pair), `missing subscription ${pair}`);
});

Then(
  'the comment event should have one job in each subscriber queue',
  async function (this: ICustomWorld) {
    const { jobQueue, prisma } = this.server.diContainer.cradle;
    const event = await prisma.event.findFirstOrThrow({
      where: { type: modelCommentEventTypes.created },
      orderBy: { createdAt: 'desc' },
    });
    const queueNames = listSubscriberEntries().map(({ queueName }) => queueName);
    const rows = await jobQueue.findJobStates(queueNames, 'eventId', [event.id]);
    assert.deepStrictEqual(rows.map((row) => row.queue).sort(), [...queueNames].sort());
  },
);
