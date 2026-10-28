import assert from 'node:assert';
import { After, Given, Then, When } from '@cucumber/cucumber';
import { HOUR_MS, MINUTE_MS } from '#src/shared/utils/consts.ts';
import {
  sendPendingDigests,
  type DigestProcessorDependencies,
} from '#src/workers/digest-processor.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

interface DigestCradle {
  userNotificationRepository: DigestProcessorDependencies['userNotificationRepository'];
  notificationPreferenceRepository: DigestProcessorDependencies['notificationPreferenceRepository'];
  userNotificationDomain: DigestProcessorDependencies['userNotificationDomain'];
  notificationDigestService: DigestProcessorDependencies['notificationDigestService'];
  mailService: { sendMailAsync: (content: unknown) => Promise<unknown> };
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
      findUniqueOrThrow: (args: {
        where: { id: string };
      }) => Promise<{ emailSentAt: Date | null; emailClaimedAt: Date | null }>;
    };
  };
}

interface DigestMailSpy {
  delivered: Array<string>;
  contents: Map<string, Array<string>>;
  failNextTo: Set<string>;
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

function getSpy(world: ICustomWorld): DigestMailSpy {
  const spy = world.context['digestMailSpy'] as DigestMailSpy | undefined;
  assert.ok(spy, 'digest mail delivery is not captured');
  return spy;
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
): Promise<{ emailSentAt: Date | null; emailClaimedAt: Date | null }> {
  const id = getSeededIds(world).get(getSeededKey(name, age, unit));
  assert.ok(id, `no notification for "${name}" created ${age} ${unit} ago`);
  return getCradle(world).prisma.userNotification.findUniqueOrThrow({ where: { id } });
}

function countDelivered(world: ICustomWorld, name: string): number {
  const { email } = getUser(world, name);
  return getSpy(world).delivered.filter((to) => to === email).length;
}

const DIGEST_CATEGORY = 'comment.on_your_model';

type SeededSubject = { targetId: string; actorUserId: string };

function getModelId(world: ICustomWorld, title: string): string {
  const id = (world.context['models'] as Map<string, string> | undefined)?.get(title);
  assert.ok(id, `no model "${title}"`);
  return id;
}

function listDigestContents(world: ICustomWorld, name: string): Array<string> {
  const { email } = getUser(world, name);
  return getSpy(world).contents.get(email) ?? [];
}

async function seedNotification(
  world: ICustomWorld,
  recipientName: string,
  email: string,
  age: number,
  unit: string,
  category = DIGEST_CATEGORY,
  subject?: SeededSubject,
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
      processedAt: new Date(),
    },
  });
  const notification = await prisma.userNotification.create({
    data: {
      recipientId: recipient.id,
      eventId: event.id,
      category,
      title: 'Digest item',
      body: 'Digest item',
      url: 'https://example.test',
      ...(subject ? { targetType: 'model', ...subject } : {}),
      createdAt: new Date(Date.now() - age * unitMs),
    },
  });
  getSeededIds(world).set(getSeededKey(recipientName, age, unit), notification.id);
}

Given('digest mail delivery is captured', function (this: ICustomWorld) {
  const { mailService } = getCradle(this);
  const original = mailService.sendMailAsync;
  const spy: DigestMailSpy = { delivered: [], contents: new Map(), failNextTo: new Set() };
  mailService.sendMailAsync = async (content: unknown) => {
    const to = (content as { to?: string }).to ?? '';
    if (spy.failNextTo.delete(to))
      throw new Error(`notification-digest.feature: rigged failure to ${to}`);
    spy.delivered.push(to);
    spy.contents.set(to, [...(spy.contents.get(to) ?? []), JSON.stringify(content)]);
  };
  this.context['digestMailSpy'] = spy;
  this.context['restoreDigestMail'] = () => {
    mailService.sendMailAsync = original;
  };
});

After(function (this: ICustomWorld) {
  const restore = this.context['restoreDigestMail'] as (() => void) | undefined;
  restore?.();
});

Given('digest mail delivery to {string} fails once', function (this: ICustomWorld, name: string) {
  getSpy(this).failNextTo.add(getUser(this, name).email);
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
  'a notification without email for {string} created {int} {word} ago',
  async function (this: ICustomWorld, name: string, age: number, unit: string) {
    await seedNotification(this, name, 'off', age, unit);
  },
);

When('the digest job runs', async function (this: ICustomWorld) {
  const cradle = getCradle(this);
  this.context['digestJobError'] = await sendPendingDigests({
    userNotificationRepository: cradle.userNotificationRepository,
    notificationPreferenceRepository: cradle.notificationPreferenceRepository,
    userNotificationDomain: cradle.userNotificationDomain,
    notificationDigestService: cradle.notificationDigestService,
    logger: this.server.log,
  }).then(
    () => undefined,
    (error: unknown) => error,
  );
});

Then('the digest job should have succeeded', function (this: ICustomWorld) {
  assert.strictEqual(this.context['digestJobError'], undefined);
});

Then('the digest job should have failed', function (this: ICustomWorld) {
  assert.ok(this.context['digestJobError'] instanceof AggregateError);
});

Then(
  '{string} should have received {int} digest(s)',
  function (this: ICustomWorld, name: string, count: number) {
    assert.strictEqual(countDelivered(this, name), count);
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
  'the notification for {string} created {int} {word} ago should be unsent and unclaimed',
  async function (this: ICustomWorld, name: string, age: number, unit: string) {
    const notification = await findSeededNotification(this, name, age, unit);
    assert.strictEqual(notification.emailSentAt, null);
    assert.strictEqual(notification.emailClaimedAt, null);
  },
);

Then(
  'the digest to {string} should name {string}',
  function (this: ICustomWorld, name: string, modelTitle: string) {
    const contents = listDigestContents(this, name);
    assert.strictEqual(contents.length, 1);
    assert.ok(
      contents[0]!.includes(modelTitle),
      `the digest to "${name}" does not name "${modelTitle}"`,
    );
  },
);

Then(
  'the digest to {string} should not name {string}',
  function (this: ICustomWorld, name: string, modelTitle: string) {
    const contents = listDigestContents(this, name);
    assert.strictEqual(contents.length, 1);
    assert.ok(!contents[0]!.includes(modelTitle), `the digest to "${name}" names "${modelTitle}"`);
  },
);
