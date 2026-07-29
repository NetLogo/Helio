import assert from 'node:assert';
import { Given, Then, When } from '@cucumber/cucumber';
import { PgBoss } from 'pg-boss';
import type { FastifyInstance } from 'fastify';
import env from '#src/config/env.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';

// The real catalog, not a copy, keeps this suite honest about which categories
// exist without asserting on their label/description copy.
const KNOWN_CATEGORIES = userNotificationDomain().categories.map((c) => c.category);

type CategoryPreference = {
  category: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
};

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

function getSnapshots(context: Record<string, unknown>): Map<string, Array<CategoryPreference>> {
  if (!context['notificationSnapshots']) context['notificationSnapshots'] = new Map();
  return context['notificationSnapshots'] as Map<string, Array<CategoryPreference>>;
}

function findCategory(list: Array<CategoryPreference>, category: string): CategoryPreference {
  const found = list.find((entry) => entry.category === category);
  assert.ok(found, `category "${category}" missing from response`);
  return found;
}

When(
  '{string} gets their notification preferences',
  async function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    this.context['lastNotificationUser'] = name;
    const response = await this.server.inject({
      method: 'GET',
      url: '/api/v1/me/notification-preferences',
      headers: { cookie: user.cookie },
    });
    this.context.latestResponse = response;

    const snapshots = getSnapshots(this.context);
    if (response.statusCode === 200 && !snapshots.has(name)) {
      const body = JSON.parse(response.body) as { categories: Array<CategoryPreference> };
      snapshots.set(name, body.categories);
    }
  },
);

When(
  '{string} turns off email for category {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    const user = getUsers(this.context).get(name)!;
    this.context['lastNotificationUser'] = name;
    this.context['lastTouchedCategory'] = category;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: '/api/v1/me/notification-preferences',
      payload: { preferences: [{ category, email: false }] },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

Given(
  '{string} opts out of category {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    const user = getUsers(this.context).get(name)!;
    await this.server.inject({
      method: 'PATCH',
      url: '/api/v1/me/notification-preferences',
      payload: { preferences: [{ category, email: false, inApp: false }] },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When('an anonymous viewer gets notification preferences', async function (this: ICustomWorld) {
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: '/api/v1/me/notification-preferences',
  });
});

When('an anonymous viewer updates notification preferences', async function (this: ICustomWorld) {
  this.context.latestResponse = await this.server.inject({
    method: 'PATCH',
    url: '/api/v1/me/notification-preferences',
    payload: { preferences: [{ category: KNOWN_CATEGORIES[0], email: false }] },
    headers: { 'content-type': 'application/json' },
  });
});

Then(
  'the notification preferences response should list every known category',
  function (this: ICustomWorld) {
    const body = JSON.parse(this.context.latestResponse!.body) as {
      categories: Array<CategoryPreference>;
    };
    const returned = body.categories.map((entry) => entry.category).sort();
    assert.deepStrictEqual(returned, [...KNOWN_CATEGORIES].sort());
    for (const entry of body.categories) {
      assert.strictEqual(typeof entry.email, 'boolean');
      assert.strictEqual(typeof entry.inApp, 'boolean');
    }
  },
);

Then('category {string} should have email false', function (this: ICustomWorld, category: string) {
  const body = JSON.parse(this.context.latestResponse!.body) as {
    categories: Array<CategoryPreference>;
  };
  const entry = findCategory(body.categories, category);
  assert.strictEqual(entry.email, false);
});

Then(
  'category {string} should have the same inApp value as before',
  function (this: ICustomWorld, category: string) {
    const name = this.context['lastNotificationUser'] as string;
    const before = findCategory(getSnapshots(this.context).get(name)!, category);
    const body = JSON.parse(this.context.latestResponse!.body) as {
      categories: Array<CategoryPreference>;
    };
    const after = findCategory(body.categories, category);
    assert.strictEqual(after.inApp, before.inApp);
  },
);

Then('every other category should be unchanged from before', function (this: ICustomWorld) {
  const name = this.context['lastNotificationUser'] as string;
  const touched = this.context['lastTouchedCategory'] as string | undefined;
  const before = getSnapshots(this.context).get(name)!;
  const body = JSON.parse(this.context.latestResponse!.body) as {
    categories: Array<CategoryPreference>;
  };
  for (const beforeEntry of before) {
    if (beforeEntry.category === touched) continue;
    const afterEntry = findCategory(body.categories, beforeEntry.category);
    assert.strictEqual(afterEntry.email, beforeEntry.email);
    assert.strictEqual(afterEntry.inApp, beforeEntry.inApp);
  }
});

Then('every category should be unchanged from before', function (this: ICustomWorld) {
  const name = this.context['lastNotificationUser'] as string;
  const before = getSnapshots(this.context).get(name)!;
  const body = JSON.parse(this.context.latestResponse!.body) as {
    categories: Array<CategoryPreference>;
  };
  for (const beforeEntry of before) {
    const afterEntry = findCategory(body.categories, beforeEntry.category);
    assert.strictEqual(afterEntry.email, beforeEntry.email);
    assert.strictEqual(afterEntry.inApp, beforeEntry.inApp);
  }
});

interface MailCall {
  to: string;
}

interface EventRow {
  processedAt: Date | null;
}

interface PrismaCradle {
  prisma: {
    event: {
      findFirst: (args: {
        where: { type: string };
        orderBy: { createdAt: 'desc' };
      }) => Promise<EventRow | null>;
    };
  };
}

function installMailSpy(server: FastifyInstance): MailCall[] {
  const calls: MailCall[] = [];
  const mailService = server.diContainer.cradle.mailService as {
    sendMailAsync: (content: unknown) => Promise<void>;
  };
  mailService.sendMailAsync = (content: unknown) => {
    const { to } = content as { to?: string };
    calls.push({ to: to ?? '' });
    return Promise.resolve();
  };
  return calls;
}

async function waitForCommentEventProcessed(
  server: FastifyInstance,
  timeoutMs = 70000,
): Promise<void> {
  const { prisma } = server.diContainer.cradle as unknown as PrismaCradle;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const event = await prisma.event.findFirst({
      where: { type: 'model_comment.created' },
      orderBy: { createdAt: 'desc' },
    });
    if (event?.processedAt) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`model_comment.created event was not processed within ${timeoutMs}ms`);
}

Given('mail delivery is captured', function (this: ICustomWorld) {
  this.context['mailCalls'] = installMailSpy(this.server);
});

Then(
  'mail should have been sent to {int} recipients',
  async function (this: ICustomWorld, count: number) {
    await waitForCommentEventProcessed(this.server);
    const calls = this.context['mailCalls'] as MailCall[];
    assert.strictEqual(calls.length, count);
  },
);

Then('mail should have been sent to {string}', function (this: ICustomWorld, actorName: string) {
  const calls = this.context['mailCalls'] as MailCall[];
  const actor = getUsers(this.context).get(actorName)!;
  assert.ok(
    calls.some((call) => call.to === actor.email),
    `Expected an email to be sent to ${actor.email}`,
  );
});

Then(
  'mail should not have been sent to {string}',
  function (this: ICustomWorld, actorName: string) {
    const calls = this.context['mailCalls'] as MailCall[];
    const actor = getUsers(this.context).get(actorName)!;
    assert.ok(
      !calls.some((call) => call.to === actor.email),
      `Expected no email to be sent to ${actor.email}`,
    );
  },
);

Then('no mail should have been sent', async function (this: ICustomWorld) {
  await waitForCommentEventProcessed(this.server);
  const calls = this.context['mailCalls'] as MailCall[];
  assert.strictEqual(calls.length, 0);
});

interface FeedNotification {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  readAt: string | null;
}

interface NotificationFeed {
  count: number;
  limit: number;
  page: number;
  data: Array<FeedNotification>;
  unreadCount: number;
}

function getFeed(context: Record<string, unknown>): NotificationFeed {
  return JSON.parse((context['latestResponse'] as { body: string }).body) as NotificationFeed;
}

function firstFeedNotification(context: Record<string, unknown>): FeedNotification {
  const feed = context['notificationFeed'] as NotificationFeed | undefined;
  assert.ok(feed, 'no notification feed has been read yet');
  const first = feed.data[0];
  assert.ok(first, 'the notification feed is empty');
  return first;
}

Given(
  '{string} mutes the in-app channel for category {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    const user = getUsers(this.context).get(name)!;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: '/api/v1/me/notification-preferences',
      payload: { preferences: [{ category, inApp: false }] },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When('the comment notification has been delivered', async function (this: ICustomWorld) {
  const boss = new PgBoss(env.db.url);
  await boss.start();
  try {
    await boss.send('process-events', {});
  } finally {
    await boss.stop({ graceful: false });
  }
  await waitForCommentEventProcessed(this.server);
});

When('{string} lists their notifications', async function (this: ICustomWorld, name: string) {
  const user = getUsers(this.context).get(name)!;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: '/api/v1/me/notifications',
    headers: { cookie: user.cookie },
  });
  if (this.context.latestResponse.statusCode === 200) {
    this.context['notificationFeed'] = getFeed(this.context);
  }
});

When('an anonymous viewer lists notifications', async function (this: ICustomWorld) {
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: '/api/v1/me/notifications',
  });
});

When(
  '{string} marks the first feed notification read',
  async function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    const notification = firstFeedNotification(this.context);
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/me/notifications/${notification.id}/read`,
      headers: { cookie: user.cookie },
    });
  },
);

Then(
  'the notification feed should contain {int} notification(s)',
  function (this: ICustomWorld, expected: number) {
    const feed = getFeed(this.context);
    assert.strictEqual(feed.data.length, expected);
    assert.strictEqual(feed.count, expected);
  },
);

Then(
  'the notification feed should report {int} unread',
  function (this: ICustomWorld, expected: number) {
    assert.strictEqual(getFeed(this.context).unreadCount, expected);
  },
);

Then(
  'the first feed notification should have category {string}',
  function (this: ICustomWorld, category: string) {
    assert.strictEqual(firstFeedNotification(this.context).category, category);
  },
);

Then('the first feed notification should be unread', function (this: ICustomWorld) {
  assert.strictEqual(firstFeedNotification(this.context).readAt, null);
});

Then('the first feed notification should be read', function (this: ICustomWorld) {
  const first = firstFeedNotification(this.context);
  assert.ok(first.readAt, 'expected the notification to carry a readAt timestamp');
});
