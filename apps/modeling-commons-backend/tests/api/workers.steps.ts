import { After, Given, When, Then } from '@cucumber/cucumber';
import { PgBoss } from 'pg-boss';
import env from '#src/config/env.ts';
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

interface EventDispatcherCradle {
  eventDispatcherService: {
    dispatch: (event: unknown) => Promise<void>;
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

// `eventDispatcherService` is a DI singleton shared across the whole scenario run
// (same pattern as the mail/repository spies in model-comment.steps.ts), so the
// After hook below restores the original `dispatch` rather than leaving a scenario's
// rig in place for whatever runs next.
Given('dispatching that event is rigged to fail once', function (this: ICustomWorld) {
  const { eventDispatcherService } = this.server.diContainer.cradle as unknown as EventDispatcherCradle;
  const original = eventDispatcherService.dispatch.bind(eventDispatcherService);
  let hasFailed = false;
  eventDispatcherService.dispatch = async (event: unknown) => {
    if (!hasFailed) {
      hasFailed = true;
      throw new Error('workers.feature: rigged dispatch failure');
    }
    return original(event);
  };
  this.context['restoreDispatch'] = () => {
    eventDispatcherService.dispatch = original;
  };
});

After(function (this: ICustomWorld) {
  const restore = this.context['restoreDispatch'] as (() => void) | undefined;
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
