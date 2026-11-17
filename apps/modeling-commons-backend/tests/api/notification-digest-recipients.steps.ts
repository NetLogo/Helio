import assert from 'node:assert';
import { Given, Then, When } from '@cucumber/cucumber';
import { HOUR_MS, MINUTE_MS } from '#src/shared/utils/consts.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

interface DigestWindow {
  since: Date;
  until: Date;
}

interface RecipientsCradle {
  userNotificationRepository: UserNotificationRepositoryPort;
  prisma: {
    user: {
      findMany: (args: {
        where: { id: { in: Array<string> } };
        orderBy: { id: 'asc' };
        select: { id: true };
      }) => Promise<Array<{ id: string }>>;
    };
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
    };
  };
}

const UNLIMITED = 100;

function getCradle(world: ICustomWorld): RecipientsCradle {
  return world.server.diContainer.cradle as unknown as RecipientsCradle;
}

function getUser(world: ICustomWorld, name: string): TestUser {
  const user = (world.context['users'] as Map<string, TestUser> | undefined)?.get(name);
  assert.ok(user, `no user "${name}"`);
  return user;
}

function getWindow(world: ICustomWorld): DigestWindow {
  const window = world.context['digestWindow'] as DigestWindow | undefined;
  assert.ok(window, 'no digest window');
  return window;
}

function resolveCreatedAt(window: DigestWindow, position: string): Date {
  const positions: Record<string, Date> = {
    'window start': window.since,
    'window end': window.until,
    'inside window': new Date((window.since.getTime() + window.until.getTime()) / 2),
    'before window': new Date(window.since.getTime() - MINUTE_MS),
    'after window': new Date(window.until.getTime() + MINUTE_MS),
  };
  const createdAt = positions[position];
  assert.ok(createdAt, `unknown window position "${position}"`);
  return createdAt;
}

function listCategories(categories: string): Array<NotificationCategory> {
  return categories
    .split(',')
    .map((category) => category.trim())
    .filter(Boolean) as Array<NotificationCategory>;
}

async function sortIdsOf(world: ICustomWorld, names: string): Promise<Array<string>> {
  const ids = names.split(',').map((name) => getUser(world, name.trim()).id);
  const users = await getCradle(world).prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

async function listRecipients(
  world: ICustomWorld,
  dailyByDefault: string,
  afterRecipientId: string | null,
  limit: number,
): Promise<void> {
  const { since, until } = getWindow(world);
  world.context['digestRecipients'] = await getCradle(
    world,
  ).userNotificationRepository.findDigestRecipients(
    since,
    until,
    listCategories(dailyByDefault),
    afterRecipientId,
    limit,
  );
}

function getRecipients(world: ICustomWorld): Array<string> {
  return world.context['digestRecipients'] as Array<string>;
}

Given(
  'the digest window runs from {int} hours ago to {int} hour(s) ago',
  function (this: ICustomWorld, sinceHours: number, untilHours: number) {
    const now = Date.now();
    this.context['digestWindow'] = {
      since: new Date(now - sinceHours * HOUR_MS),
      until: new Date(now - untilHours * HOUR_MS),
    } satisfies DigestWindow;
  },
);

Given(
  'the stored preference of {string} for {string} is {string} email',
  async function (this: ICustomWorld, name: string, category: string, email: string) {
    const userId = getUser(this, name).id;
    await getCradle(this).prisma.userNotificationPreference.upsert({
      where: { userId_category: { userId, category } },
      create: { userId, category, email, inApp: true },
      update: { email },
    });
  },
);

Given(
  'a digest notification for {string} in {string} that is {string} at {string}',
  async function (
    this: ICustomWorld,
    name: string,
    category: string,
    state: string,
    position: string,
  ) {
    assert.ok(state === 'sent' || state === 'unsent', `unknown notification state "${state}"`);
    const recipient = getUser(this, name);
    const { prisma } = getCradle(this);
    const event = await prisma.event.create({
      data: {
        type: 'test.event',
        actorId: recipient.id,
        resourceType: 'test',
        resourceId: recipient.id,
        payload: {},
      },
    });
    await prisma.userNotification.create({
      data: {
        recipientId: recipient.id,
        eventId: event.id,
        category,
        url: 'https://example.test',
        createdAt: resolveCreatedAt(getWindow(this), position),
        ...(state === 'sent' ? { emailSentAt: new Date() } : {}),
      },
    });
  },
);

When(
  'digest recipients are listed with daily defaults {string}',
  async function (this: ICustomWorld, dailyByDefault: string) {
    await listRecipients(this, dailyByDefault, null, UNLIMITED);
  },
);

When(
  'digest recipients are listed with daily defaults {string} and limit {int}',
  async function (this: ICustomWorld, dailyByDefault: string, limit: number) {
    await listRecipients(this, dailyByDefault, null, limit);
  },
);

When(
  'digest recipients are listed with daily defaults {string} after the middle recipient of {string}',
  async function (this: ICustomWorld, dailyByDefault: string, names: string) {
    const ids = await sortIdsOf(this, names);
    assert.strictEqual(ids.length, 3, 'the middle recipient needs exactly three names');
    await listRecipients(this, dailyByDefault, ids[1]!, UNLIMITED);
  },
);

Then(
  'the digest recipients should be {string} in id order',
  async function (this: ICustomWorld, names: string) {
    assert.deepStrictEqual(getRecipients(this), await sortIdsOf(this, names));
  },
);

Then(
  'the digest recipients should be the first {int} of {string} in id order',
  async function (this: ICustomWorld, count: number, names: string) {
    assert.deepStrictEqual(getRecipients(this), (await sortIdsOf(this, names)).slice(0, count));
  },
);

Then(
  'the digest recipients should be the last of {string} in id order',
  async function (this: ICustomWorld, names: string) {
    assert.deepStrictEqual(getRecipients(this), (await sortIdsOf(this, names)).slice(-1));
  },
);
