import { Given, When, Then } from '@cucumber/cucumber';
import { PgBoss } from 'pg-boss';
import env from '#src/config/env.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

interface PrismaCradle {
  prisma: {
    event: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      findUnique: (args: {
        where: { id: string };
      }) => Promise<{ id: string; processedAt: Date | null } | null>;
    };
  };
}

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
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
    const { prisma } = this.server.diContainer.cradle as unknown as PrismaCradle;
    const deadline = Date.now() + seconds * 1000;

    while (Date.now() < deadline) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (event?.processedAt) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Event ${eventId} was not processed within ${seconds}s`);
  },
);
