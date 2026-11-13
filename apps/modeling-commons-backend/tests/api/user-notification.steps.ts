import assert from 'node:assert';
import { Given, Then, When } from '@cucumber/cucumber';
import env from '#src/config/env.ts';
import links from '#src/config/links.ts';
import notificationsConfig from '#src/config/notifications.ts';
import { HOUR_MS } from '#src/shared/utils/consts.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';
import { findEmailJobsByRecipient } from '../support/email-jobs.ts';
import { waitForEventsDispatched } from '../support/subscriber-jobs.ts';
import { getEmailLinks } from '#src/modules/user-notification/email/email-links.domain.ts';
import { readUnsubscribeToken } from '#src/modules/user-notification/core/unsubscribe-token.domain.ts';
import type { InsertUserNotificationParams } from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
import { notificationCategories } from '#src/modules/notification-catalog.ts';

// The real catalog, not a copy, keeps this suite honest about which categories
// exist without asserting on their label/description copy.
const KNOWN_CATEGORIES = notificationCategories;
const EMAIL_MODES: ReadonlyArray<unknown> = ['immediate', 'daily', 'off'];

type CategoryPreference = {
  category: string;
  label: string;
  description: string;
  email: 'immediate' | 'daily' | 'off';
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
      payload: { preferences: [{ category, email: 'off' }] },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When(
  '{string} sets email to {string} for category {string}',
  async function (this: ICustomWorld, name: string, mode: string, category: string) {
    const user = getUsers(this.context).get(name)!;
    this.context['lastNotificationUser'] = name;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: '/api/v1/me/notification-preferences',
      payload: { preferences: [{ category, email: mode }] },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When(
  '{string} sets email to the boolean true for category {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    const user = getUsers(this.context).get(name)!;
    this.context['lastNotificationUser'] = name;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: '/api/v1/me/notification-preferences',
      payload: { preferences: [{ category, email: true }] },
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
      payload: { preferences: [{ category, email: 'off', inApp: false }] },
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
    payload: { preferences: [{ category: KNOWN_CATEGORIES[0], email: 'off' }] },
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
      assert.ok(EMAIL_MODES.includes(entry.email), `unexpected email mode ${String(entry.email)}`);
      assert.strictEqual(typeof entry.inApp, 'boolean');
    }
  },
);

Then(
  'category {string} should have email {string}',
  function (this: ICustomWorld, category: string, mode: string) {
    const body = JSON.parse(this.context.latestResponse!.body) as {
      categories: Array<CategoryPreference>;
    };
    const entry = findCategory(body.categories, category);
    assert.strictEqual(entry.email, mode);
  },
);

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
  subject: string;
  text: string;
}

interface PrismaCradle {
  prisma: {
    userNotification: {
      findMany: (args: {
        where: { recipientId: string };
      }) => Promise<Array<{ emailSentAt: Date | null; inAppSuppressed: boolean }>>;
      updateMany: (args: {
        where: { recipientId: string };
        data: { createdAt: Date };
      }) => Promise<unknown>;
    };
  };
}

async function listQueuedEmails(world: ICustomWorld): Promise<Array<MailCall>> {
  const addresses = [...getUsers(world.context).values()].map((user) => user.email);
  const jobs = await findEmailJobsByRecipient(world.server, addresses);
  return jobs.map(({ data }) => ({
    to: String(data.to ?? ''),
    subject: data.subject ?? '',
    text: String(data.text ?? ''),
  }));
}

async function hasEmailSentNotification(world: ICustomWorld, user: TestUser): Promise<boolean> {
  const { prisma } = world.server.diContainer.cradle as unknown as PrismaCradle;
  const notifications = await prisma.userNotification.findMany({ where: { recipientId: user.id } });
  return notifications.some((notification) => notification.emailSentAt !== null);
}

Then(
  'mail should have been sent to {int} recipients',
  async function (this: ICustomWorld, count: number) {
    await waitForEventsDispatched(this.server);
    const calls = await listQueuedEmails(this);
    assert.strictEqual(calls.length, count);
  },
);

Then(
  'mail should have been sent to {string}',
  async function (this: ICustomWorld, actorName: string) {
    const calls = await listQueuedEmails(this);
    const actor = getUsers(this.context).get(actorName)!;
    assert.ok(
      calls.some((call) => call.to === actor.email),
      `Expected an email to be queued for ${actor.email}`,
    );
    assert.ok(
      await hasEmailSentNotification(this, actor),
      `Expected the notification for ${actor.email} to be marked sent`,
    );
  },
);

Then(
  'mail should not have been sent to {string}',
  async function (this: ICustomWorld, actorName: string) {
    const calls = await listQueuedEmails(this);
    const actor = getUsers(this.context).get(actorName)!;
    assert.ok(
      !calls.some((call) => call.to === actor.email),
      `Expected no email to be queued for ${actor.email}`,
    );
  },
);

Then('no mail should have been sent', async function (this: ICustomWorld) {
  await waitForEventsDispatched(this.server);
  const calls = await listQueuedEmails(this);
  assert.strictEqual(calls.length, 0);
});

Given(
  'the notifications of {string} are older than the pending window',
  async function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    const { prisma } = this.server.diContainer.cradle as unknown as PrismaCradle;
    await prisma.userNotification.updateMany({
      where: { recipientId: user.id },
      data: { createdAt: new Date(Date.now() - notificationsConfig.windowMs - HOUR_MS) },
    });
  },
);

Then('no notification summary should be emailed', async function (this: ICustomWorld) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const calls = await listQueuedEmails(this);
  assert.strictEqual(calls.length, 0);
});

Then(
  'one notification summary should be emailed to {string}',
  async function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    const deadline = Date.now() + 10_000;
    while ((await listQueuedEmails(this)).length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    const calls = await listQueuedEmails(this);

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0]!.to, user.email);
    assert.match(calls[0]!.subject, /Notification Summary/);
  },
);

Then(
  'the notification summary should list {string} once',
  async function (this: ICustomWorld, line: string) {
    const calls = await listQueuedEmails(this);
    assert.strictEqual(calls[0]!.text.split(line).length - 1, 1, calls[0]!.text);
  },
);

interface FeedNotification {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string;
  actor: { name: string | null; thumbnailUrl: string | null; url: string } | null;
  target: { name: string | null; thumbnailUrl: string | null; url: string } | null;
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

async function setInAppChannel(
  world: ICustomWorld,
  name: string,
  category: string,
  inApp: boolean,
): Promise<void> {
  const user = getUsers(world.context).get(name)!;
  world.context.latestResponse = await world.server.inject({
    method: 'PATCH',
    url: '/api/v1/me/notification-preferences',
    payload: { preferences: [{ category, inApp }] },
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });
}

Given(
  '{string} mutes the in-app channel for category {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    await setInAppChannel(this, name, category, false);
  },
);

When(
  '{string} unmutes the in-app channel for category {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    await setInAppChannel(this, name, category, true);
  },
);

Then(
  'the notifications should hold {int} in-app suppressed notification(s) for {string}',
  async function (this: ICustomWorld, expected: number, name: string) {
    const user = getUsers(this.context).get(name)!;
    const { prisma } = this.server.diContainer.cradle as unknown as PrismaCradle;
    const notifications = await prisma.userNotification.findMany({
      where: { recipientId: user.id },
    });
    assert.strictEqual(notifications.length, expected);
    assert.ok(
      notifications.every((notification) => notification.inAppSuppressed === true),
      'Expected every notification to be stamped inAppSuppressed',
    );
  },
);

When('the comment notification has been delivered', async function (this: ICustomWorld) {
  await waitForEventsDispatched(this.server);
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

Then(
  'the first feed notification should link its actor to {string}',
  function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    const { actor } = firstFeedNotification(this.context);
    assert.ok(actor, 'expected the notification to carry an actor');
    assert.match(actor.url, new RegExp(`/users/${user.id}$`));
    assert.strictEqual(actor.name, user.name);
    // Test users are created without an avatar, so the slot is linkable but imageless.
    // The url is derived on read from the stored reference, never persisted.
    assert.strictEqual(actor.thumbnailUrl, null);
  },
);

Then(
  'the first feed notification should target the model it was left on',
  function (this: ICustomWorld) {
    const { target } = firstFeedNotification(this.context);
    assert.ok(target, 'expected the notification to carry a target');
    assert.match(target.url, /\/models\/[^/]+$/);
  },
);

Then('the first feed notification should be unread', function (this: ICustomWorld) {
  assert.strictEqual(firstFeedNotification(this.context).readAt, null);
});

Then('the first feed notification should be read', function (this: ICustomWorld) {
  const first = firstFeedNotification(this.context);
  assert.ok(first.readAt, 'expected the notification to carry a readAt timestamp');
});

interface ExistingNotificationFixture {
  params: InsertUserNotificationParams;
  notificationId: string;
}

Given(
  'a notification already exists for {string}',
  async function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    const { prisma, transactionManager, userNotificationRepository } =
      this.server.diContainer.cradle;
    const event = await prisma.event.create({
      data: {
        type: 'test.notification',
        actorId: user.id,
        resourceType: 'model',
        resourceId: 'notification-model',
        payload: {},
      },
    });
    const params: InsertUserNotificationParams = {
      recipientId: user.id,
      eventId: event.id,
      category: 'comment.on_your_model',
      url: 'https://example.test/notification',
      payload: {
        commentId: 'notification-comment',
        excerpt: 'Notification "text" \\ with ünïcode',
      },
      inAppSuppressed: false,
    };
    const notification = await transactionManager.run((ctx) =>
      userNotificationRepository.insertTx(ctx, params),
    );
    this.context['existingNotification'] = {
      params,
      notificationId: notification.id,
    } satisfies ExistingNotificationFixture;
  },
);

When(
  'the same notification is recorded again followed by another write in one transaction',
  async function (this: ICustomWorld) {
    const { params, notificationId } = this.context[
      'existingNotification'
    ] as ExistingNotificationFixture;
    const { transactionManager, userNotificationRepository } = this.server.diContainer.cradle;
    this.context['rerecordOutcome'] = await transactionManager
      .run(async (ctx) => {
        const notification = await userNotificationRepository.insertTx(ctx, params);
        await userNotificationRepository.markEmailSentTx([notificationId], new Date(), ctx);
        return { notificationId: notification.id };
      })
      .catch((error: unknown) => ({ error: String(error) }));
  },
);

Then(
  'the transaction should commit both writes on the one existing notification',
  async function (this: ICustomWorld) {
    const { params, notificationId } = this.context[
      'existingNotification'
    ] as ExistingNotificationFixture;
    const outcome = this.context['rerecordOutcome'] as { notificationId?: string; error?: string };
    assert.strictEqual(outcome.error, undefined, outcome.error);
    assert.strictEqual(outcome.notificationId, notificationId);

    const notifications = await this.server.diContainer.cradle.prisma.userNotification.findMany({
      where: { eventId: params.eventId, recipientId: params.recipientId },
    });
    assert.strictEqual(notifications.length, 1);
    assert.ok(notifications[0]!.emailSentAt, 'expected the second write to set emailSentAt');
  },
);

Then(
  'the notification should keep the payload it was recorded with',
  async function (this: ICustomWorld) {
    const { params, notificationId } = this.context[
      'existingNotification'
    ] as ExistingNotificationFixture;
    const notification =
      await this.server.diContainer.cradle.prisma.userNotification.findUniqueOrThrow({
        where: { id: notificationId },
      });
    assert.deepStrictEqual(notification.payload, params.payload);
  },
);

When(
  '{string} renames themselves to {string}',
  async function (this: ICustomWorld, name: string, newName: string) {
    const user = getUsers(this.context).get(name)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: '/api/auth/update-user',
      payload: { name: newName },
      headers: {
        cookie: user.cookie,
        'content-type': 'application/json',
        origin: env.cors.allowedOrigins[0],
      },
    });
    assert.strictEqual(
      this.context.latestResponse.statusCode,
      200,
      this.context.latestResponse.body,
    );
    user.name = newName;
  },
);

Then(
  'the first feed notification should have title {string}',
  function (this: ICustomWorld, title: string) {
    assert.strictEqual(firstFeedNotification(this.context).title, title);
  },
);

Then(
  'the first feed notification should have body {string}',
  function (this: ICustomWorld, body: string) {
    assert.strictEqual(firstFeedNotification(this.context).body, body);
  },
);

Then(
  'the first feed notification should target a model named {string}',
  function (this: ICustomWorld, name: string) {
    assert.strictEqual(firstFeedNotification(this.context).target?.name, name);
  },
);

Then(
  'no field of the notification feed should contain {string}',
  function (this: ICustomWorld, text: string) {
    const raw = (this.context['latestResponse'] as { body: string }).body;
    assert.ok(raw.length > 0, 'the notification feed response is empty');
    assert.ok(!raw.includes(text), `the notification feed mentions "${text}": ${raw}`);
  },
);

const ONE_CLICK_BODY = 'List-Unsubscribe=One-Click';

type UnsubscribeLinks = { oneClickUrl: string; pageUrl: string };

function getUnsubscribeLinks(context: Record<string, unknown>): Map<string, UnsubscribeLinks> {
  if (!context['unsubscribeLinks']) context['unsubscribeLinks'] = new Map();
  return context['unsubscribeLinks'] as Map<string, UnsubscribeLinks>;
}

function readToken(url: string): string {
  return new URL(url).searchParams.get('token') ?? '';
}

async function postOneClickUnsubscribe(world: ICustomWorld, url: URL): Promise<void> {
  const { pathname, search } = url;
  world.context.latestResponse = await world.server.inject({
    method: 'POST',
    url: `${pathname}${search}`,
    payload: ONE_CLICK_BODY,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
}

Then(
  'the email to {string} should carry a one-click unsubscribe for category {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    const user = getUsers(this.context).get(name)!;
    const [job] = await findEmailJobsByRecipient(this.server, [user.email]);
    assert.ok(job, `Expected an email to be queued for ${user.email}`);
    const headers = (job.data.headers ?? {}) as Record<string, string>;

    assert.strictEqual(headers['List-Unsubscribe-Post'], ONE_CLICK_BODY);
    const match = /^<(.+)>$/.exec(headers['List-Unsubscribe'] ?? '');
    assert.ok(match, `Expected a List-Unsubscribe URL, got ${headers['List-Unsubscribe']}`);
    const oneClickUrl = match[1]!;

    assert.deepStrictEqual(await readUnsubscribeToken(readToken(oneClickUrl)), {
      userId: user.id,
      categories: [category],
    });
    const pageUrl = links.notificationUnsubscribe(readToken(oneClickUrl));
    assert.ok(
      String(job.data.html ?? '').includes(pageUrl),
      `Expected the email body to link to ${pageUrl}`,
    );
    getUnsubscribeLinks(this.context).set(name, { oneClickUrl, pageUrl });
  },
);

When(
  'the mail client of {string} posts its one-click unsubscribe',
  async function (this: ICustomWorld, name: string) {
    const { oneClickUrl } = getUnsubscribeLinks(this.context).get(name)!;
    await postOneClickUnsubscribe(this, new URL(oneClickUrl));
  },
);

When(
  'a mail client posts a one-click unsubscribe for {string} whose category was tampered to {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    const user = getUsers(this.context).get(name)!;
    const signed = await getEmailLinks(user.id, ['comment.reply_to_you']);
    const [header, , signature] = readToken(signed.oneClickUnsubscribeUrl).split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        aud: notificationsConfig.unsubscribeTokenPurpose,
        categories: [category],
      }),
    ).toString('base64url');
    const url = new URL(signed.oneClickUnsubscribeUrl);
    url.searchParams.set('token', `${header}.${forgedPayload}.${signature}`);
    await postOneClickUnsubscribe(this, url);
  },
);

When(
  'a mail client posts a one-click unsubscribe with a malformed token',
  async function (this: ICustomWorld) {
    const url = new URL('/api/v1/notification-unsubscribe', 'http://localhost');
    url.searchParams.set('token', 'not-a-token');
    await postOneClickUnsubscribe(this, url);
  },
);

Then(
  'every category other than {string} should be unchanged from before',
  function (this: ICustomWorld, touched: string) {
    const name = this.context['lastNotificationUser'] as string;
    const before = getSnapshots(this.context).get(name)!;
    const body = JSON.parse(this.context.latestResponse!.body) as {
      categories: Array<CategoryPreference>;
    };
    for (const beforeEntry of before.filter((entry) => entry.category !== touched)) {
      const afterEntry = findCategory(body.categories, beforeEntry.category);
      assert.strictEqual(afterEntry.email, beforeEntry.email);
      assert.strictEqual(afterEntry.inApp, beforeEntry.inApp);
    }
  },
);
