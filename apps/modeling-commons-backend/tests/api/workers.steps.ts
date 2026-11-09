import assert from 'node:assert';
import { After, Given, When, Then } from '@cucumber/cucumber';
import pg from 'pg';
import env from '#src/config/env.ts';
import realtimeConfig from '#src/config/realtime.ts';
import workersConfig from '#src/config/workers.ts';
import { getDeadLetterQueueName } from '#src/workers/queues.ts';
import type { JobStateRow } from '#src/shared/jobs/job-queue.port.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';
import {
  emailDeadLetterQueueName,
  emailQueueName,
  haveAllCompleted,
  listEmailJobs,
  waitForEmailJobs,
  type EmailJob,
} from '../support/email-jobs.ts';

const { queueName } = workersConfig.userNotifications;
const deadLetterQueueName = getDeadLetterQueueName(queueName);

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

async function waitForUserNotificationRow(
  world: ICustomWorld,
  seconds: number,
  isDone: (row: JobStateRow) => boolean,
): Promise<JobStateRow | undefined> {
  const eventId = world.context['pendingEventId'] as string;
  const { jobQueue } = world.server.diContainer.cradle;
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    const rows = await jobQueue.findJobStates([queueName, deadLetterQueueName], 'eventId', [
      eventId,
    ]);
    const row = rows.find(isDone);
    if (row) return row;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return undefined;
}

function rigHandleEvent(world: ICustomWorld, shouldFail: () => boolean): void {
  const { userNotificationService } = world.server.diContainer.cradle;
  const original = userNotificationService.handleEvent.bind(userNotificationService);
  userNotificationService.handleEvent = async (event) => {
    if (shouldFail()) throw new Error('workers.feature: rigged handleEvent failure');
    return original(event);
  };
  world.context['restoreHandleEvent'] = () => {
    userNotificationService.handleEvent = original;
  };
}

Given(
  'events of type {string} are published to the user-notifications queue',
  async function (this: ICustomWorld, eventType: string) {
    const { boss } = this.server.diContainer.cradle;
    await boss.subscribe(eventType, queueName);
    this.context['restoreSubscription'] = async () => boss.unsubscribe(eventType, queueName);
  },
);

After(async function (this: ICustomWorld) {
  const restore = this.context['restoreSubscription'] as (() => Promise<void>) | undefined;
  await restore?.();
});

Given(
  'an event of type {string} is recorded for {string}',
  async function (this: ICustomWorld, eventType: string, actorName: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const { eventRepository, prisma, transactionManager } = this.server.diContainer.cradle;
    await transactionManager.run(async (ctx) =>
      eventRepository.insertTx(ctx, {
        type: eventType,
        actorId: actor.id,
        resourceType: 'test',
        resourceId: actor.id,
        payload: {},
      }),
    );
    const event = await prisma.event.findFirstOrThrow({
      where: { type: eventType, resourceId: actor.id },
      orderBy: { createdAt: 'desc' },
    });
    this.context['pendingEventId'] = event.id;
  },
);

Given('handling events is rigged to fail once', function (this: ICustomWorld) {
  let hasFailed = false;
  rigHandleEvent(this, () => {
    if (hasFailed) return false;
    hasFailed = true;
    return true;
  });
});

Given('handling events is rigged to always fail', function (this: ICustomWorld) {
  rigHandleEvent(this, () => true);
});

After(function (this: ICustomWorld) {
  const restore = this.context['restoreHandleEvent'] as (() => void) | undefined;
  restore?.();
});

When(
  'a user-notifications job for that event is sent with a retry limit of {int} and a retry delay of {int} second(s)',
  async function (this: ICustomWorld, retryLimit: number, retryDelay: number) {
    const eventId = this.context['pendingEventId'] as string;
    const { jobQueue } = this.server.diContainer.cradle;
    await jobQueue.send(queueName, { eventId }, { retryLimit, retryDelay });
  },
);

Then(
  'the user-notifications job of that event should complete within {int} seconds',
  async function (this: ICustomWorld, seconds: number) {
    const row = await waitForUserNotificationRow(
      this,
      seconds,
      (candidate) => candidate.state === 'completed',
    );
    assert.ok(row, `The user-notifications job did not complete within ${seconds}s`);
  },
);

Then(
  'the user-notifications job of that event should wait to retry after {int} attempt(s) within {int} seconds',
  async function (this: ICustomWorld, attempts: number, seconds: number) {
    const row = await waitForUserNotificationRow(
      this,
      seconds,
      (candidate) => candidate.state === 'retry',
    );
    assert.ok(row, `The user-notifications job did not reach the retry state within ${seconds}s`);
    assert.strictEqual(row.retryCount + 1, attempts);
  },
);

Then(
  'a copy of the user-notifications job should reach the dead-letter queue within {int} seconds',
  async function (this: ICustomWorld, seconds: number) {
    const row = await waitForUserNotificationRow(
      this,
      seconds,
      (candidate) => candidate.queue === deadLetterQueueName,
    );
    assert.ok(row, `No dead-letter copy of the user-notifications job appeared within ${seconds}s`);
  },
);

type MailRecorder = {
  sent: Array<Mail.Options>;
  attempts: Map<string, number>;
  shouldFail: (content: Mail.Options) => boolean;
};

function getMailRecorder(world: ICustomWorld): MailRecorder {
  const existing = world.context['mailRecorder'] as MailRecorder | undefined;
  if (existing) return existing;
  const recorder: MailRecorder = { sent: [], attempts: new Map(), shouldFail: () => false };
  const { mailService } = world.server.diContainer.cradle;
  const original = mailService.sendMailAsync;
  mailService.sendMailAsync = async (content) => {
    const to = String(content.to);
    recorder.attempts.set(to, (recorder.attempts.get(to) ?? 0) + 1);
    if (recorder.shouldFail(content)) throw new Error('workers.feature: rigged send failure');
    recorder.sent.push(content);
    return { messageId: `workers-feature-${recorder.sent.length}` } as Awaited<
      ReturnType<typeof original>
    >;
  };
  world.context['mailRecorder'] = recorder;
  world.context['restoreSendMail'] = () => {
    mailService.sendMailAsync = original;
  };
  return recorder;
}

After(function (this: ICustomWorld) {
  const restore = this.context['restoreSendMail'] as (() => void) | undefined;
  restore?.();
});

function getAddress(world: ICustomWorld, name: string): string {
  const user = getUsers(world.context).get(name);
  assert.ok(user, `no user "${name}"`);
  return user.email;
}

function buildEmail(to: string, subject = 'workers.feature'): Mail.Options {
  return { to, subject, text: 'workers.feature' };
}

function countSentTo(world: ICustomWorld, address: string): number {
  return getMailRecorder(world).sent.filter((content) => content.to === address).length;
}

async function waitForEmailJob(
  world: ICustomWorld,
  name: string,
  seconds: number,
  isDone: (job: EmailJob) => boolean,
  queueName: string = emailQueueName,
): Promise<EmailJob | undefined> {
  const jobs = await waitForEmailJobs(
    world.server,
    [getAddress(world, name)],
    (candidates) => candidates.some(isDone),
    { timeoutMs: seconds * 1000, queueName },
  );
  return jobs?.find(isDone);
}

Given('email sending is recorded', function (this: ICustomWorld) {
  getMailRecorder(this);
});

Given('sending email to {string} is rigged to fail', function (this: ICustomWorld, name: string) {
  const address = getAddress(this, name);
  getMailRecorder(this).shouldFail = (content) => content.to === address;
});

Given(
  'sending email to {string} is rigged to fail once',
  function (this: ICustomWorld, name: string) {
    const address = getAddress(this, name);
    const recorder = getMailRecorder(this);
    recorder.shouldFail = (content) =>
      content.to === address && recorder.attempts.get(address) === 1;
  },
);

When('an email to {string} is queued', async function (this: ICustomWorld, name: string) {
  const { mailService } = this.server.diContainer.cradle;
  await mailService.enqueue(buildEmail(getAddress(this, name)));
});

When(
  '{int} emails to {string} are queued',
  async function (this: ICustomWorld, count: number, name: string) {
    const { mailService } = this.server.diContainer.cradle;
    const address = getAddress(this, name);
    for (let index = 1; index <= count; index++) {
      await mailService.enqueue(buildEmail(address, `workers.feature #${index}`));
    }
  },
);

When(
  'an email to {string} is sent with a retry limit of {int} and a retry delay of {int} second(s)',
  async function (this: ICustomWorld, name: string, retryLimit: number, retryDelay: number) {
    const { jobQueue } = this.server.diContainer.cradle;
    await jobQueue.send(emailQueueName, buildEmail(getAddress(this, name)), {
      retryLimit,
      retryDelay,
    });
  },
);

When(
  'an email to {string} is sent with a retry delay of {int} second(s)',
  async function (this: ICustomWorld, name: string, retryDelay: number) {
    const { jobQueue } = this.server.diContainer.cradle;
    await jobQueue.send(emailQueueName, buildEmail(getAddress(this, name)), { retryDelay });
  },
);

Then(
  'the email job to {string} should complete within {int} seconds',
  async function (this: ICustomWorld, name: string, seconds: number) {
    const job = await waitForEmailJob(this, name, seconds, (row) => row.state === 'completed');
    assert.ok(job, `The email job to "${name}" did not complete within ${seconds}s`);
    this.context[`emailJob:${name}`] = job;
  },
);

Then(
  'the email job to {string} should wait to retry after {int} attempt(s) within {int} seconds',
  async function (this: ICustomWorld, name: string, attempts: number, seconds: number) {
    const job = await waitForEmailJob(this, name, seconds, (row) => row.state === 'retry');
    assert.ok(job, `The email job to "${name}" did not reach the retry state within ${seconds}s`);
    assert.strictEqual(job.retryCount + 1, attempts);
    this.context[`emailJob:${name}`] = job;
  },
);

Then(
  'the email job to {string} should have been retried {int} time(s)',
  function (this: ICustomWorld, name: string, retries: number) {
    const job = this.context[`emailJob:${name}`] as EmailJob | undefined;
    assert.ok(job, `no email job to "${name}" was observed`);
    assert.strictEqual(job.retryCount, retries);
  },
);

Then(
  'the email job to {string} should stay waiting to retry with {int} attempt(s) for {int} seconds',
  async function (this: ICustomWorld, name: string, attempts: number, seconds: number) {
    const address = getAddress(this, name);
    const recorder = getMailRecorder(this);
    const deadline = Date.now() + seconds * 1000;
    while (Date.now() < deadline) {
      assert.strictEqual(recorder.attempts.get(address), attempts);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const [job] = await listEmailJobs(this.server, [address]);
    assert.strictEqual(job?.state, 'retry');
  },
);

Then(
  'a copy of the email job to {string} should reach the dead-letter queue within {int} seconds',
  async function (this: ICustomWorld, name: string, seconds: number) {
    const job = await waitForEmailJob(this, name, seconds, () => true, emailDeadLetterQueueName);
    assert.ok(job, `No dead-letter copy of the email job to "${name}" appeared within ${seconds}s`);
  },
);

Then(
  'every email job to {string} should complete within {int} seconds',
  async function (this: ICustomWorld, name: string, seconds: number) {
    const jobs = await waitForEmailJobs(this.server, [getAddress(this, name)], haveAllCompleted, {
      timeoutMs: seconds * 1000,
    });
    assert.ok(jobs, `Not every email job to "${name}" completed within ${seconds}s`);
  },
);

Then(
  'exactly {int} email(s) should have been sent to {string}',
  function (this: ICustomWorld, count: number, name: string) {
    assert.strictEqual(countSentTo(this, getAddress(this, name)), count);
  },
);

Then('no email should have been sent to {string}', function (this: ICustomWorld, name: string) {
  assert.strictEqual(countSentTo(this, getAddress(this, name)), 0);
});

Then(
  'each of the {int} emails to {string} should have been sent exactly once',
  function (this: ICustomWorld, count: number, name: string) {
    const address = getAddress(this, name);
    const subjects = getMailRecorder(this)
      .sent.filter((content) => content.to === address)
      .map((content) => content.subject)
      .sort();
    const expected = Array.from(
      { length: count },
      (_, index) => `workers.feature #${index + 1}`,
    ).sort();
    assert.deepStrictEqual(subjects, expected);
  },
);

type RealtimeListener = {
  client: pg.Client;
  received: Array<{ channel: string; payload: string }>;
};

Given('the realtime channels are listened to', async function (this: ICustomWorld) {
  const client = new pg.Client({ connectionString: env.db.url });
  const listener: RealtimeListener = { client, received: [] };
  client.on('notification', ({ channel, payload }) => {
    listener.received.push({ channel, payload: payload ?? '' });
  });
  await client.connect();
  for (const channel of Object.values(realtimeConfig.channels)) {
    await client.query(`LISTEN ${channel}`);
  }
  this.context['realtimeListener'] = listener;
});

After(async function (this: ICustomWorld) {
  const listener = this.context['realtimeListener'] as RealtimeListener | undefined;
  await listener?.client.end();
});

async function waitForSignal(
  world: ICustomWorld,
  channel: string,
  payload: string,
  seconds: number,
): Promise<number> {
  const listener = world.context['realtimeListener'] as RealtimeListener;
  const count = () =>
    listener.received.filter((signal) => signal.channel === channel && signal.payload === payload)
      .length;
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline && count() === 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return count();
}

Then(
  'the model channel should carry the id of {string} once within {int} seconds',
  async function (this: ICustomWorld, modelTitle: string, seconds: number) {
    const models = this.context['models'] as Map<string, string>;
    const modelId = models.get(modelTitle);
    assert.ok(modelId, `no model "${modelTitle}"`);
    assert.strictEqual(
      await waitForSignal(this, realtimeConfig.channels.model, modelId, seconds),
      1,
    );
  },
);

Then(
  'the user channel should carry the id of {string} once within {int} seconds',
  async function (this: ICustomWorld, userName: string, seconds: number) {
    const user = getUsers(this.context).get(userName);
    assert.ok(user, `no user "${userName}"`);
    assert.strictEqual(
      await waitForSignal(this, realtimeConfig.channels.user, user.id, seconds),
      1,
    );
  },
);

Then(
  'the user channel should not carry the id of {string}',
  function (this: ICustomWorld, userName: string) {
    const listener = this.context['realtimeListener'] as RealtimeListener;
    const user = getUsers(this.context).get(userName);
    assert.ok(user, `no user "${userName}"`);
    assert.ok(
      !listener.received.some(
        (signal) => signal.channel === realtimeConfig.channels.user && signal.payload === user.id,
      ),
    );
  },
);
