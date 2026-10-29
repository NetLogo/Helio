import { After, Given, When, Then } from '@cucumber/cucumber';
import { PgBoss } from 'pg-boss';
import env from '#src/config/env.ts';
import { HOUR_MS } from '#src/shared/utils/consts.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

interface EventRow {
  id: string;
  processedAt: Date | null;
  attempts: number;
  lastError: string | null;
}

interface PrismaCradle {
  prisma: {
    event: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      findUnique: (args: { where: { id: string } }) => Promise<EventRow | null>;
    };
  };
}

interface EmailQueueRow {
  id: string;
  sentAt: Date | null;
  attempts: number;
  lastError: string | null;
}

interface EmailQueueCradle {
  prisma: {
    emailQueue: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      findUnique: (args: { where: { id: string } }) => Promise<EmailQueueRow | null>;
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
    };
  };
  mailService: { sendMailAsync: (content: { to?: unknown }) => Promise<unknown> };
}

interface UserNotificationCradle {
  userNotificationService: {
    handleEvent: (event: unknown) => Promise<void>;
  };
}

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

async function loadEvent(this: ICustomWorld): Promise<EventRow | null> {
  const eventId = this.context['pendingEventId'] as string;
  const { prisma } = this.server.diContainer.cradle as unknown as PrismaCradle;
  return prisma.event.findUnique({ where: { id: eventId } });
}

Given(
  'an unprocessed event of type {string} exists for {string}',
  async function (this: ICustomWorld, eventType: string, actorName: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const { prisma } = this.server.diContainer.cradle as unknown as PrismaCradle;
    const event = await prisma.event.create({
      data: {
        type: eventType,
        actorId: actor.id,
        resourceType: 'test',
        resourceId: actor.id,
        payload: {},
      },
    });
    this.context['pendingEventId'] = event.id;
  },
);

Given(
  'an unprocessed event of type {string} exists for {string} with {int} prior attempts',
  async function (this: ICustomWorld, eventType: string, actorName: string, attempts: number) {
    const actor = getUsers(this.context).get(actorName)!;
    const { prisma } = this.server.diContainer.cradle as unknown as PrismaCradle;
    const event = await prisma.event.create({
      data: {
        type: eventType,
        actorId: actor.id,
        resourceType: 'test',
        resourceId: actor.id,
        payload: {},
        attempts,
      },
    });
    this.context['pendingEventId'] = event.id;
  },
);

// `userNotificationService` is a DI singleton shared across the whole scenario run
// (same pattern as the mail/repository spies in model-comment.steps.ts), so the
// After hook below restores the original `handleEvent` rather than leaving a scenario's
// rig in place for whatever runs next.
Given('handling that event is rigged to fail once', function (this: ICustomWorld) {
  const { userNotificationService } = this.server.diContainer
    .cradle as unknown as UserNotificationCradle;
  const original = userNotificationService.handleEvent.bind(userNotificationService);
  let hasFailed = false;
  userNotificationService.handleEvent = async (event: unknown) => {
    if (!hasFailed) {
      hasFailed = true;
      throw new Error('workers.feature: rigged handleEvent failure');
    }
    return original(event);
  };
  this.context['restoreHandleEvent'] = () => {
    userNotificationService.handleEvent = original;
  };
});

When('sending email is restored', function (this: ICustomWorld) {
  const restore = this.context['restoreSendMail'] as () => void;
  restore();
});

When(
  'the queued email to {string} is due for retry',
  async function (this: ICustomWorld, name: string) {
    const id = getQueuedEmailIds(this.context).get(name)!;
    const { prisma } = this.server.diContainer.cradle as unknown as EmailQueueCradle;
    await prisma.emailQueue.update({ where: { id }, data: { nextAttemptAt: new Date() } });
  },
);

After(function (this: ICustomWorld) {
  const restore = this.context['restoreHandleEvent'] as (() => void) | undefined;
  restore?.();
});

When('the event processor queue is triggered', async function (this: ICustomWorld) {
  const boss = new PgBoss(env.db.url);
  await boss.start();
  try {
    await boss.send('process-events', {});
  } finally {
    await boss.stop({ graceful: false });
  }
});

Then(
  'the event should be marked processed within {int} seconds',
  async function (this: ICustomWorld, seconds: number) {
    const eventId = this.context['pendingEventId'] as string;
    const deadline = Date.now() + seconds * 1000;

    while (Date.now() < deadline) {
      const event = await loadEvent.call(this);
      if (event?.processedAt) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Event ${eventId} was not processed within ${seconds}s`);
  },
);

Then(
  'the event should have {int} attempt(s) and a recorded error within {int} seconds',
  async function (this: ICustomWorld, expectedAttempts: number, seconds: number) {
    const eventId = this.context['pendingEventId'] as string;
    const deadline = Date.now() + seconds * 1000;

    while (Date.now() < deadline) {
      const event = await loadEvent.call(this);
      if (event && event.attempts > 0 && event.lastError) {
        if (event.attempts !== expectedAttempts) {
          throw new Error(
            `Expected event ${eventId} to have ${expectedAttempts} attempt(s), got ${event.attempts}`,
          );
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(
      `Event ${eventId} did not reach ${expectedAttempts} attempt(s) with a recorded error within ${seconds}s`,
    );
  },
);

Then(
  'the event should still have {int} attempt(s) after {int} seconds',
  async function (this: ICustomWorld, expectedAttempts: number, seconds: number) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

    const eventId = this.context['pendingEventId'] as string;
    const event = await loadEvent.call(this);
    if (!event || event.attempts !== expectedAttempts) {
      throw new Error(
        `Expected event ${eventId} to still have ${expectedAttempts} attempt(s), got ${event?.attempts}`,
      );
    }
  },
);

Then('the event should still be unprocessed', async function (this: ICustomWorld) {
  const eventId = this.context['pendingEventId'] as string;
  const event = await loadEvent.call(this);
  if (!event || event.processedAt) {
    throw new Error(`Expected event ${eventId} to remain unprocessed`);
  }
});

function getQueuedEmailIds(context: Record<string, unknown>): Map<string, string> {
  if (!context['queuedEmailIds']) context['queuedEmailIds'] = new Map<string, string>();
  return context['queuedEmailIds'] as Map<string, string>;
}

async function queueEmail(
  world: ICustomWorld,
  recipientName: string,
  attempts = 0,
  nextAttemptAt: Date | null = null,
): Promise<void> {
  const recipient = getUsers(world.context).get(recipientName)!;
  const { prisma } = world.server.diContainer.cradle as unknown as EmailQueueCradle;
  const email = await prisma.emailQueue.create({
    data: {
      content: { to: recipient.email, subject: 'workers.feature', text: 'workers.feature' },
      attempts,
      nextAttemptAt,
    },
  });
  getQueuedEmailIds(world.context).set(recipientName, email.id);
}

async function loadQueuedEmail(world: ICustomWorld, recipientName: string): Promise<EmailQueueRow> {
  const id = getQueuedEmailIds(world.context).get(recipientName);
  if (!id) throw new Error(`No queued email to "${recipientName}"`);
  const { prisma } = world.server.diContainer.cradle as unknown as EmailQueueCradle;
  const email = await prisma.emailQueue.findUnique({ where: { id } });
  if (!email) throw new Error(`Queued email ${id} is gone`);
  return email;
}

async function waitForQueuedEmail(
  world: ICustomWorld,
  recipientName: string,
  seconds: number,
  isDone: (email: EmailQueueRow) => boolean,
): Promise<EmailQueueRow | undefined> {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    const email = await loadQueuedEmail(world, recipientName);
    if (isDone(email)) return email;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return undefined;
}

Given('a queued email to {string} exists', async function (this: ICustomWorld, name: string) {
  await queueEmail(this, name);
});

Given(
  'a queued email to {string} exists with {int} prior attempts',
  async function (this: ICustomWorld, name: string, attempts: number) {
    await queueEmail(this, name, attempts);
  },
);

Given(
  'a queued email to {string} exists that is not due for another hour',
  async function (this: ICustomWorld, name: string) {
    await queueEmail(this, name, 0, new Date(Date.now() + HOUR_MS));
  },
);

Given('sending email to {string} is rigged to fail', function (this: ICustomWorld, name: string) {
  const { email } = getUsers(this.context).get(name)!;
  const { mailService } = this.server.diContainer.cradle as unknown as EmailQueueCradle;
  const original = mailService.sendMailAsync.bind(mailService);
  mailService.sendMailAsync = async (content) => {
    if (content.to === email) throw new Error('workers.feature: rigged send failure');
    return original(content);
  };
  this.context['restoreSendMail'] = () => {
    mailService.sendMailAsync = original;
  };
});

After(function (this: ICustomWorld) {
  const restore = this.context['restoreSendMail'] as (() => void) | undefined;
  restore?.();
});

When('the email sender queue is triggered', async function () {
  const boss = new PgBoss(env.db.url);
  await boss.start();
  await boss.send('send-emails', {}).finally(async () => boss.stop({ graceful: false }));
});

When(
  'the email sender has sent the queued emails to {string}',
  async function (this: ICustomWorld, name: string) {
    const { email } = getUsers(this.context).get(name)!;
    const { prisma } = this.server.diContainer.cradle as unknown as {
      prisma: {
        emailQueue: {
          count: (args: { where: Record<string, unknown> }) => Promise<number>;
        };
      };
    };
    const boss = new PgBoss(env.db.url);
    await boss.start();
    await boss.send('send-emails', {}).finally(async () => boss.stop({ graceful: false }));

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const unsent = await prisma.emailQueue.count({
        where: { sentAt: null, content: { path: ['to'], equals: email } },
      });
      if (unsent === 0) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`The email sender did not send every queued email to ${email} within 10s`);
  },
);

Then(
  'the queued email to {string} should be marked sent within {int} seconds',
  async function (this: ICustomWorld, name: string, seconds: number) {
    const email = await waitForQueuedEmail(this, name, seconds, (row) => row.sentAt !== null);
    if (!email) throw new Error(`The queued email to "${name}" was not sent within ${seconds}s`);
    this.context[`sentAt:${name}`] = email.sentAt;
  },
);

Then(
  'the queued email to {string} should have {int} attempt(s) and a recorded error within {int} seconds',
  async function (this: ICustomWorld, name: string, expectedAttempts: number, seconds: number) {
    const email = await waitForQueuedEmail(
      this,
      name,
      seconds,
      (row) => row.attempts > 0 && row.lastError !== null,
    );
    if (!email) {
      throw new Error(
        `The queued email to "${name}" recorded no failed attempt within ${seconds}s`,
      );
    }
    if (email.attempts !== expectedAttempts) {
      throw new Error(
        `Expected the queued email to "${name}" to have ${expectedAttempts} attempt(s), got ${email.attempts}`,
      );
    }
  },
);

Then(
  'the queued email to {string} should still have {int} attempts after {int} seconds',
  async function (this: ICustomWorld, name: string, expectedAttempts: number, seconds: number) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    const email = await loadQueuedEmail(this, name);
    if (email.attempts !== expectedAttempts) {
      throw new Error(
        `Expected the queued email to "${name}" to still have ${expectedAttempts} attempt(s), got ${email.attempts}`,
      );
    }
  },
);

Then(
  'the queued email to {string} should keep its sent time and {int} attempt(s) after {int} seconds',
  async function (this: ICustomWorld, name: string, expectedAttempts: number, seconds: number) {
    const sentAt = this.context[`sentAt:${name}`] as Date;
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    const email = await loadQueuedEmail(this, name);
    if (email.sentAt?.getTime() !== sentAt.getTime() || email.attempts !== expectedAttempts) {
      throw new Error(
        `Expected the queued email to "${name}" to stay sent at ${sentAt.toISOString()} with ${expectedAttempts} attempt(s), got ${email.sentAt?.toISOString()} with ${email.attempts}`,
      );
    }
  },
);

Then(
  'the queued email to {string} should still be unsent',
  async function (this: ICustomWorld, name: string) {
    const email = await loadQueuedEmail(this, name);
    if (email.sentAt) throw new Error(`Expected the queued email to "${name}" to remain unsent`);
  },
);
