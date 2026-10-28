import assert from 'node:assert';
import { Given, Then, When } from '@cucumber/cucumber';
import notificationsConfig from '#src/config/notifications.ts';
import { MINUTE_MS } from '#src/shared/utils/consts.ts';
import type { EmailClaimRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

interface ClaimRow {
  emailSentAt: Date | null;
  emailClaimedAt: Date | null;
}

interface ClaimCradle {
  userNotificationRepository: UserNotificationRepositoryPort;
  prisma: {
    event: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
    userNotification: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      findUniqueOrThrow: (args: { where: { id: string } }) => Promise<ClaimRow>;
    };
  };
}

function getCradle(world: ICustomWorld): ClaimCradle {
  return world.server.diContainer.cradle as unknown as ClaimCradle;
}

function getRowIds(context: Record<string, unknown>): Map<string, string> {
  if (!context['claimRowIds']) context['claimRowIds'] = new Map<string, string>();
  return context['claimRowIds'] as Map<string, string>;
}

function getClaims(context: Record<string, unknown>): Map<string, Date> {
  if (!context['claimsByName']) context['claimsByName'] = new Map<string, Date>();
  return context['claimsByName'] as Map<string, Date>;
}

function getRowId(world: ICustomWorld, label: string): string {
  const id = getRowIds(world.context).get(label);
  assert.ok(id, `no seeded notification "${label}"`);
  return id;
}

function getClaim(world: ICustomWorld, name: string): Date {
  const claimedAt = getClaims(world.context).get(name);
  assert.ok(claimedAt, `no claim "${name}"`);
  return claimedAt;
}

function findLabel(world: ICustomWorld, id: string): string {
  const entry = [...getRowIds(world.context)].find(([, rowId]) => rowId === id);
  assert.ok(entry, `claimed an unseeded row ${id}`);
  return entry[0];
}

function listLabels(labels: string): Array<string> {
  return labels.split(',').map((label) => label.trim());
}

function getExpiredClaimTime(): Date {
  return new Date(Date.now() - notificationsConfig.claimLeaseMs - MINUTE_MS);
}

function getLiveClaimTime(): Date {
  return new Date(Date.now() - notificationsConfig.claimLeaseMs + MINUTE_MS);
}

async function seedRow(
  world: ICustomWorld,
  label: string,
  recipientName: string,
  columns: { emailSentAt?: Date; emailClaimedAt?: Date },
): Promise<void> {
  const recipient = (world.context['users'] as Map<string, TestUser>).get(recipientName)!;
  const { prisma } = getCradle(world);
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
  const row = await prisma.userNotification.create({
    data: {
      recipientId: recipient.id,
      eventId: event.id,
      category: 'comment.on_your_model',
      title: label,
      body: label,
      url: 'https://example.test',
      ...columns,
    },
  });
  getRowIds(world.context).set(label, row.id);
}

async function claimRows(world: ICustomWorld, labels: string): Promise<void> {
  const ids = listLabels(labels).map((label) => getRowId(world, label));
  world.context['lastClaims'] = await getCradle(world).userNotificationRepository.claimUnsent(
    ids,
    notificationsConfig.claimLeaseMs,
  );
}

function getLastClaims(world: ICustomWorld): Array<EmailClaimRecord> {
  return world.context['lastClaims'] as Array<EmailClaimRecord>;
}

Given(
  'an unsent notification {string} for {string}',
  async function (this: ICustomWorld, label: string, recipient: string) {
    await seedRow(this, label, recipient, {});
  },
);

Given(
  'an unsent notification {string} for {string} claimed just over the lease ago',
  async function (this: ICustomWorld, label: string, recipient: string) {
    await seedRow(this, label, recipient, { emailClaimedAt: getExpiredClaimTime() });
  },
);

Given(
  'an unsent notification {string} for {string} claimed just under the lease ago',
  async function (this: ICustomWorld, label: string, recipient: string) {
    await seedRow(this, label, recipient, { emailClaimedAt: getLiveClaimTime() });
  },
);

Given(
  'a sent notification {string} for {string}',
  async function (this: ICustomWorld, label: string, recipient: string) {
    await seedRow(this, label, recipient, { emailSentAt: new Date() });
  },
);

Given(
  'the notification {string} has been claimed as {string}',
  async function (this: ICustomWorld, label: string, name: string) {
    await claimRows(this, label);
    const [claim] = getLastClaims(this);
    assert.ok(claim, `"${label}" could not be claimed`);
    getClaims(this.context).set(name, claim.emailClaimedAt);
  },
);

Given('the claim on {string} has outlived the lease', async function (this: ICustomWorld, label: string) {
  await getCradle(this).prisma.userNotification.update({
    where: { id: getRowId(this, label) },
    data: { emailClaimedAt: getExpiredClaimTime() },
  });
});

When('the notifications {string} are claimed', async function (this: ICustomWorld, labels: string) {
  await claimRows(this, labels);
});

When(
  'the notification {string} is marked sent under claim {string}',
  async function (this: ICustomWorld, label: string, name: string) {
    await getCradle(this).userNotificationRepository.markSent(
      [getRowId(this, label)],
      getClaim(this, name),
      new Date(),
    );
  },
);

When(
  'the claim {string} on {string} is released',
  async function (this: ICustomWorld, name: string, label: string) {
    await getCradle(this).userNotificationRepository.releaseClaim(
      [getRowId(this, label)],
      getClaim(this, name),
    );
  },
);

Then('the claimed notifications should be {string}', function (this: ICustomWorld, labels: string) {
  const claimed = getLastClaims(this).map((claim) => findLabel(this, claim.id));
  assert.deepStrictEqual(claimed.sort(), listLabels(labels).sort());
});

Then(
  'the notification {string} should be unsent and held by claim {string}',
  async function (this: ICustomWorld, label: string, name: string) {
    const row = await getCradle(this).prisma.userNotification.findUniqueOrThrow({
      where: { id: getRowId(this, label) },
    });
    assert.strictEqual(row.emailSentAt, null);
    assert.strictEqual(row.emailClaimedAt?.getTime(), getClaim(this, name).getTime());
  },
);

Then(
  'the notification {string} should be sent and unclaimed',
  async function (this: ICustomWorld, label: string) {
    const row = await getCradle(this).prisma.userNotification.findUniqueOrThrow({
      where: { id: getRowId(this, label) },
    });
    assert.ok(row.emailSentAt, `"${label}" was not marked sent`);
    assert.strictEqual(row.emailClaimedAt, null);
  },
);

Then(
  'the claimed notifications should share the claim time stored on each row',
  async function (this: ICustomWorld) {
    const claims = getLastClaims(this);
    const claimTimes = new Set(claims.map((claim) => claim.emailClaimedAt.getTime()));
    assert.strictEqual(claimTimes.size, 1, 'claims do not share one claim time');
    const [claimTime] = claimTimes;
    const { prisma } = getCradle(this);
    for (const claim of claims) {
      const row = await prisma.userNotification.findUniqueOrThrow({ where: { id: claim.id } });
      assert.strictEqual(row.emailClaimedAt?.getTime(), claimTime);
    }
  },
);
