import assert from 'node:assert';
import { After, Given, Then, When } from '@cucumber/cucumber';
import { HOUR_MS, MINUTE_MS } from '#src/shared/utils/consts.ts';
import type { JobWithMetadata } from 'pg-boss';
import workersConfig from '#src/config/workers.ts';
import type { SendDigestJobData } from '#src/workers/digest-processor.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import { listEmailJobs } from '../support/email-jobs.ts';
import type { TestUser } from '../support/auth-helper.ts';

const { queueNotificationDigests, sendDigest } = workersConfig;

type DigestJob = JobWithMetadata<SendDigestJobData>;

interface DigestCradle {
  notificationDigestService: Dependencies['notificationDigestService'];
  prisma: {
    event: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
    userNotificationPreference: {
      upsert: (args: {
        where: { userId_category: { userId: string; category: string } };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<unknown>;
    };
    userNotification: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      findUniqueOrThrow: (args: { where: { id: string } }) => Promise<{ emailSentAt: Date | null }>;
    };
  };
}

const AGE_UNITS_MS: Record<string, number> = {
  minute: MINUTE_MS,
  minutes: MINUTE_MS,
  hour: HOUR_MS,
  hours: HOUR_MS,
};

function getCradle(world: ICustomWorld): DigestCradle {
  return world.server.diContainer.cradle as unknown as DigestCradle;
}

function getUser(world: ICustomWorld, name: string): TestUser {
  const user = (world.context['users'] as Map<string, TestUser> | undefined)?.get(name);
  assert.ok(user, `no user "${name}"`);
  return user;
}

function getSeededKey(name: string, age: number, unit: string): string {
  return `${name} ${age} ${unit}`;
}

function getSeededIds(world: ICustomWorld): Map<string, string> {
  const existing = world.context['seededNotificationIds'] as Map<string, string> | undefined;
  if (existing) return existing;
  const created = new Map<string, string>();
  world.context['seededNotificationIds'] = created;
  return created;
}

async function findSeededNotification(
  world: ICustomWorld,
  name: string,
  age: number,
  unit: string,
): Promise<{ emailSentAt: Date | null }> {
  const id = getSeededIds(world).get(getSeededKey(name, age, unit));
  assert.ok(id, `no notification for "${name}" created ${age} ${unit} ago`);
  return getCradle(world).prisma.userNotification.findUniqueOrThrow({ where: { id } });
}

async function listQueuedDigests(world: ICustomWorld, name: string): Promise<Array<string>> {
  const { email } = getUser(world, name);
  const jobs = await listEmailJobs(world.server, [email]);
  return jobs.map((job) => JSON.stringify(job.data));
}

const DIGEST_CATEGORY = 'comment.on_your_model';

const DIGEST_MODEL_TITLE = 'Digest Model';

type SeededSubject = { targetId: string; actorUserId?: string };

function getModelId(world: ICustomWorld, title: string): string {
  const id = (world.context['models'] as Map<string, string> | undefined)?.get(title);
  assert.ok(id, `no model "${title}"`);
  return id;
}

async function seedNotification(
  world: ICustomWorld,
  recipientName: string,
  email: string,
  age: number,
  unit: string,
  category = DIGEST_CATEGORY,
  subject: SeededSubject = { targetId: getModelId(world, DIGEST_MODEL_TITLE) },
): Promise<void> {
  const unitMs = AGE_UNITS_MS[unit];
  assert.ok(unitMs, `unknown age unit "${unit}"`);
  const recipient = getUser(world, recipientName);
  const { prisma } = getCradle(world);
  await prisma.userNotificationPreference.upsert({
    where: { userId_category: { userId: recipient.id, category } },
    create: { userId: recipient.id, category, email, inApp: true },
    update: { email },
  });
  const event = await prisma.event.create({
    data: {
      type: 'test.event',
      actorId: recipient.id,
      resourceType: 'test',
      resourceId: recipient.id,
      payload: {},
    },
  });
  const notification = await prisma.userNotification.create({
    data: {
      recipientId: recipient.id,
      eventId: event.id,
      category,
      url: 'https://example.test',
      targetType: 'model',
      ...subject,
      createdAt: new Date(Date.now() - age * unitMs),
    },
  });
  getSeededIds(world).set(getSeededKey(recipientName, age, unit), notification.id);
}

Given(
  'digest delivery to {string} is rigged to fail once',
  function (this: ICustomWorld, name: string) {
    const { id } = getUser(this, name);
    const { notificationDigestService } = getCradle(this);
    const original = notificationDigestService.queueDigest;
    let hasFailed = false;
    notificationDigestService.queueDigest = async (recipientId, rows, preferences) => {
      if (recipientId === id && !hasFailed) {
        hasFailed = true;
        throw new Error(`notification-digest.feature: rigged failure to ${name}`);
      }
      return original(recipientId, rows, preferences);
    };
    this.context['restoreDigestDelivery'] = () => {
      notificationDigestService.queueDigest = original;
    };
  },
);

Given(
  'send-digest jobs retry after {int} second(s)',
  async function (this: ICustomWorld, seconds: number) {
    const { boss } = this.server.diContainer.cradle;
    await boss.updateQueue(sendDigest.queueName, { retryDelay: seconds });
    this.context['restoreSendDigestRetryDelay'] = async () =>
      boss.updateQueue(sendDigest.queueName, { retryDelay: sendDigest.queue.retryDelay });
  },
);

After(async function (this: ICustomWorld) {
  const restoreDelivery = this.context['restoreDigestDelivery'] as (() => void) | undefined;
  restoreDelivery?.();
  const restoreRetryDelay = this.context['restoreSendDigestRetryDelay'] as
    | (() => Promise<void>)
    | undefined;
  await restoreRetryDelay?.();
});

Given(
  'a {string} notification for {string} created {int} {word} ago',
  async function (this: ICustomWorld, mode: string, name: string, age: number, unit: string) {
    await seedNotification(this, name, mode, age, unit);
  },
);

Given(
  'a {string} notification in category {string} for {string} created {int} {word} ago',
  async function (
    this: ICustomWorld,
    mode: string,
    category: string,
    name: string,
    age: number,
    unit: string,
  ) {
    await seedNotification(this, name, mode, age, unit, category);
  },
);

Given(
  'a {string} notification for {string} about {string} from {string} created {int} {word} ago',
  async function (
    this: ICustomWorld,
    mode: string,
    name: string,
    modelTitle: string,
    actorName: string,
    age: number,
    unit: string,
  ) {
    await seedNotification(this, name, mode, age, unit, DIGEST_CATEGORY, {
      targetId: getModelId(this, modelTitle),
      actorUserId: getUser(this, actorName).id,
    });
  },
);

Given(
  'a {string} notification in category {string} for {string} about {string} from {string} created {int} {word} ago',
  async function (
    this: ICustomWorld,
    mode: string,
    category: string,
    name: string,
    modelTitle: string,
    actorName: string,
    age: number,
    unit: string,
  ) {
    await seedNotification(this, name, mode, age, unit, category, {
      targetId: getModelId(this, modelTitle),
      actorUserId: getUser(this, actorName).id,
    });
  },
);

Given(
  'a notification without email for {string} created {int} {word} ago',
  async function (this: ICustomWorld, name: string, age: number, unit: string) {
    await seedNotification(this, name, 'off', age, unit);
  },
);

async function pollUntil<T>(
  read: () => Promise<T>,
  isDone: (value: T) => boolean,
  timeoutMs = 15_000,
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (isDone(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return undefined;
}

const SETTLED_STATES = new Set(['completed', 'retry', 'failed']);

async function listDigestJobs(world: ICustomWorld): Promise<Array<DigestJob>> {
  const { boss } = world.server.diContainer.cradle;
  return boss.findJobs<SendDigestJobData>(sendDigest.queueName);
}

function findDigestJobs(world: ICustomWorld, name: string): Array<DigestJob> {
  const { id } = getUser(world, name);
  const jobs = world.context['digestJobs'] as Array<DigestJob> | undefined;
  assert.ok(jobs, 'the digest job has not run');
  return jobs.filter((job) => job.data.recipientId === id);
}

function findDigestJob(world: ICustomWorld, name: string): DigestJob {
  const jobs = findDigestJobs(world, name);
  assert.strictEqual(jobs.length, 1, `expected one send-digest job for "${name}"`);
  return jobs[0]!;
}

When('the digest job runs', async function (this: ICustomWorld) {
  const { boss } = this.server.diContainer.cradle;
  const fanOutJobId = await boss.send(queueNotificationDigests.queueName);
  assert.ok(fanOutJobId, 'the fan-out job was not created');
  const fanOutJob = await pollUntil(
    async () => boss.getJobById(queueNotificationDigests.queueName, fanOutJobId),
    (job) => job?.state === 'completed',
  );
  assert.ok(fanOutJob, 'the fan-out job did not complete within 15s');
  const digestJobs = await pollUntil(
    async () => listDigestJobs(this),
    (jobs) => jobs.every((job) => SETTLED_STATES.has(job.state)),
  );
  assert.ok(digestJobs, 'the send-digest jobs did not settle within 15s');
  this.context['digestJobs'] = digestJobs;
});

Then('the digest job should have succeeded', function (this: ICustomWorld) {
  const jobs = this.context['digestJobs'] as Array<DigestJob>;
  assert.deepStrictEqual(
    jobs.filter((job) => job.state !== 'completed').map((job) => job.state),
    [],
  );
});

Then(
  'the send-digest job for {string} should complete on its second attempt',
  async function (this: ICustomWorld, name: string) {
    const { boss } = this.server.diContainer.cradle;
    const { id } = findDigestJob(this, name);
    const job = await pollUntil(
      async () => boss.getJobById<SendDigestJobData>(sendDigest.queueName, id),
      (current) => current?.state === 'completed',
    );
    assert.ok(job, `the send-digest job for "${name}" did not complete within 15s`);
    assert.strictEqual(job.retryCount, 1);
  },
);

Then(
  'the send-digest job for {string} should have completed',
  function (this: ICustomWorld, name: string) {
    assert.strictEqual(findDigestJob(this, name).state, 'completed');
  },
);

Then(
  'the send-digest job for {string} should carry the same window as the one for {string}',
  function (this: ICustomWorld, name: string, otherName: string) {
    const { since, until } = findDigestJob(this, name).data;
    const other = findDigestJob(this, otherName).data;
    assert.deepStrictEqual({ since, until }, { since: other.since, until: other.until });
  },
);

Then(
  'there should be exactly {int} send-digest job(s) for {string}',
  function (this: ICustomWorld, count: number, name: string) {
    assert.strictEqual(findDigestJobs(this, name).length, count);
  },
);

Then(
  '{string} should have received {int} digest(s)',
  async function (this: ICustomWorld, name: string, count: number) {
    assert.strictEqual((await listQueuedDigests(this, name)).length, count);
  },
);

Then(
  'the notification for {string} created {int} {word} ago should be sent',
  async function (this: ICustomWorld, name: string, age: number, unit: string) {
    const notification = await findSeededNotification(this, name, age, unit);
    assert.ok(notification.emailSentAt);
  },
);

Then(
  'the notification for {string} created {int} {word} ago should be unsent',
  async function (this: ICustomWorld, name: string, age: number, unit: string) {
    const notification = await findSeededNotification(this, name, age, unit);
    assert.strictEqual(notification.emailSentAt, null);
  },
);

Then(
  'the digest to {string} should name {string}',
  async function (this: ICustomWorld, name: string, modelTitle: string) {
    const contents = await listQueuedDigests(this, name);
    assert.strictEqual(contents.length, 1);
    assert.ok(
      contents[0]!.includes(modelTitle),
      `the digest to "${name}" does not name "${modelTitle}"`,
    );
  },
);

Then(
  'the digest to {string} should not name {string}',
  async function (this: ICustomWorld, name: string, modelTitle: string) {
    const contents = await listQueuedDigests(this, name);
    assert.strictEqual(contents.length, 1);
    assert.ok(!contents[0]!.includes(modelTitle), `the digest to "${name}" names "${modelTitle}"`);
  },
);
