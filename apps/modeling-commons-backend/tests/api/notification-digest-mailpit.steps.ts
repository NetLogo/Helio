import assert from 'node:assert';
import { After, Given, Then } from '@cucumber/cucumber';
import env from '#src/config/env.ts';
import { targetPhrases } from '#src/modules/user-notification/domain/user-notification.grouping.ts';
import { formatUserList } from '#src/shared/utils/formatters.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

const MAILPIT_API = `${env.smtp.mailpitUrl}/api/v1`;

interface MailpitSummary {
  ID: string;
  To: Array<{ Address: string }>;
  Subject: string;
}

interface MailpitMessage {
  Subject: string;
  Text: string;
}

interface SummaryEmailCradle {
  mailDomain: {
    createNotificationSummaryEmail: (
      userEmail: string,
      userName: string,
      notifications: Array<{ text: string; url: string }>,
      moreCount: number,
      feedUrl: string,
      unsubscribeUrl: string,
      preferencesUrl: string,
    ) => Promise<{ subject: string }>;
  };
}

function getUser(world: ICustomWorld, name: string): TestUser {
  const user = (world.context['users'] as Map<string, TestUser> | undefined)?.get(name);
  assert.ok(user, `no user "${name}"`);
  return user;
}

function getCleanupAddresses(world: ICustomWorld): Set<string> {
  const existing = world.context['mailpitAddresses'] as Set<string> | undefined;
  if (existing) return existing;
  const created = new Set<string>();
  world.context['mailpitAddresses'] = created;
  return created;
}

function buildSearchUrl(address: string): string {
  const url = new URL(`${MAILPIT_API}/search`);
  url.searchParams.set('query', `to:"${address}"`);
  return url.toString();
}

async function deleteMessagesTo(address: string): Promise<void> {
  const response = await fetch(buildSearchUrl(address), { method: 'DELETE' });
  assert.ok(response.ok, `Mailpit refused to delete messages to ${address}: ${response.status}`);
}

async function listMessagesTo(address: string): Promise<Array<MailpitSummary>> {
  const response = await fetch(buildSearchUrl(address));
  assert.ok(response.ok, `Mailpit search for ${address} failed: ${response.status}`);
  const { messages } = (await response.json()) as { messages: Array<MailpitSummary> };
  return messages.filter((message) => message.To.some((to) => to.Address === address));
}

async function findOnlyMessageTo(address: string): Promise<MailpitMessage> {
  const [summary, ...rest] = await listMessagesTo(address);
  assert.ok(summary, `Mailpit holds no message to ${address}`);
  assert.strictEqual(rest.length, 0, `Mailpit holds more than one message to ${address}`);
  const response = await fetch(`${MAILPIT_API}/message/${summary.ID}`);
  assert.ok(response.ok, `Mailpit could not return message ${summary.ID}: ${response.status}`);
  return (await response.json()) as MailpitMessage;
}

Given('Mailpit is reachable', async function () {
  const response = await fetch(`${MAILPIT_API}/info`);
  assert.ok(response.ok, `Mailpit is not reachable at ${MAILPIT_API}; start it with "yarn svc"`);
});

Given('Mailpit holds no messages to {string}', async function (this: ICustomWorld, name: string) {
  const { email } = getUser(this, name);
  getCleanupAddresses(this).add(email);
  await deleteMessagesTo(email);
});

After({ tags: '@mailpit' }, async function (this: ICustomWorld) {
  const addresses = (this.context['mailpitAddresses'] as Set<string> | undefined) ?? new Set();
  for (const address of addresses) await deleteMessagesTo(address);
});

Then(
  'Mailpit should hold exactly {int} message(s) to {string}',
  async function (this: ICustomWorld, count: number, name: string) {
    const messages = await listMessagesTo(getUser(this, name).email);
    assert.strictEqual(messages.length, count);
  },
);

Then(
  'the Mailpit message to {string} should have the digest subject',
  async function (this: ICustomWorld, name: string) {
    const user = getUser(this, name);
    const { mailDomain } = this.server.diContainer.cradle as unknown as SummaryEmailCradle;
    const expected = await mailDomain.createNotificationSummaryEmail(
      user.email,
      user.name,
      [],
      0,
      '',
      '',
      '',
    );
    const message = await findOnlyMessageTo(user.email);
    assert.strictEqual(message.Subject, expected.subject);
  },
);

Then(
  'the Mailpit message to {string} should say {string} and {string} commented on {string}',
  async function (
    this: ICustomWorld,
    name: string,
    firstActor: string,
    secondActor: string,
    modelTitle: string,
  ) {
    const actors = [getUser(this, firstActor).name, getUser(this, secondActor).name];
    const line = `${formatUserList(actors, actors.length)} ${targetPhrases.model} ${modelTitle}`;
    const message = await findOnlyMessageTo(getUser(this, name).email);
    assert.ok(message.Text.includes(line), `the digest text does not contain "${line}"`);
  },
);
