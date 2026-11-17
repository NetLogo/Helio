import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { Given, Then, When } from '@cucumber/cucumber';
import { DAY_MS } from '#src/shared/utils/consts.ts';
import {
  purgeNotifications,
  type NotificationJanitorDependencies,
} from '#src/workers/notification-janitor.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

interface JanitorCradle {
  userNotificationRepository: NotificationJanitorDependencies['userNotificationRepository'];
  prisma: {
    event: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
    userNotification: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
    };
  };
}

function getCradle(world: ICustomWorld): JanitorCradle {
  return world.server.diContainer.cradle as unknown as JanitorCradle;
}

function getUser(world: ICustomWorld, name: string): TestUser {
  const user = (world.context['users'] as Map<string, TestUser> | undefined)?.get(name);
  assert.ok(user, `no user "${name}"`);
  return user;
}

function getMap(world: ICustomWorld, key: string): Map<string, string> {
  const existing = world.context[key] as Map<string, string> | undefined;
  if (existing) return existing;
  const created = new Map<string, string>();
  world.context[key] = created;
  return created;
}

function getModelId(world: ICustomWorld, label: string): string {
  const id = getMap(world, 'models').get(label);
  assert.ok(id, `no model "${label}"`);
  return id;
}

function getSeededKey(name: string, target: string, days: number): string {
  return `${name} ${target} ${days}`;
}

async function seedNotification(
  world: ICustomWorld,
  name: string,
  target: string,
  targetId: string | null,
  days: number,
): Promise<void> {
  const recipient = getUser(world, name);
  const { prisma } = getCradle(world);
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
      category: 'comment.on_your_model',
      url: 'https://example.test',
      targetType: targetId ? 'model' : null,
      targetId,
      createdAt: new Date(Date.now() - days * DAY_MS),
    },
  });
  getMap(world, 'janitorNotificationIds').set(getSeededKey(name, target, days), notification.id);
}

async function isSeededNotificationPresent(
  world: ICustomWorld,
  name: string,
  target: string,
  days: number,
): Promise<boolean> {
  const id = getMap(world, 'janitorNotificationIds').get(getSeededKey(name, target, days));
  assert.ok(id, `no notification for "${name}" on ${target} created ${days} days ago`);
  return (await getCradle(world).prisma.userNotification.findUnique({ where: { id } })) !== null;
}

Given(
  'a notification for {string} on model {string} created {int} day(s) ago',
  async function (this: ICustomWorld, name: string, label: string, days: number) {
    await seedNotification(this, name, `model ${label}`, getModelId(this, label), days);
  },
);

Given(
  'a notification for {string} on a missing model created {int} day(s) ago',
  async function (this: ICustomWorld, name: string, days: number) {
    await seedNotification(this, name, 'missing model', randomUUID(), days);
  },
);

Given(
  'a notification for {string} without a target created {int} day(s) ago',
  async function (this: ICustomWorld, name: string, days: number) {
    await seedNotification(this, name, 'no target', null, days);
  },
);

When('the notification janitor runs', async function (this: ICustomWorld) {
  const { userNotificationRepository } = getCradle(this);
  await purgeNotifications({
    userNotificationRepository,
    logger: this.server.log,
  });
});

Then(
  'the notification for {string} on model {string} created {int} day(s) ago should remain',
  async function (this: ICustomWorld, name: string, label: string, days: number) {
    assert.ok(await isSeededNotificationPresent(this, name, `model ${label}`, days));
  },
);

Then(
  'the notification for {string} on model {string} created {int} day(s) ago should be gone',
  async function (this: ICustomWorld, name: string, label: string, days: number) {
    assert.ok(!(await isSeededNotificationPresent(this, name, `model ${label}`, days)));
  },
);

Then(
  'the notification for {string} on a missing model created {int} day(s) ago should be gone',
  async function (this: ICustomWorld, name: string, days: number) {
    assert.ok(!(await isSeededNotificationPresent(this, name, 'missing model', days)));
  },
);

Then(
  'the notification for {string} without a target created {int} day(s) ago should remain',
  async function (this: ICustomWorld, name: string, days: number) {
    assert.ok(await isSeededNotificationPresent(this, name, 'no target', days));
  },
);
