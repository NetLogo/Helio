import assert from 'node:assert';
import { After, Given, Then, When } from '@cucumber/cucumber';
import env from '#src/config/env.ts';
import { PUBLIC_PREFIX } from '#src/modules/file/domain/file.types.ts';
import { modelCommentLiterals } from '#src/modules/model-comment/notifications/model-comment.literals.ts';
import { formatUserList } from '#src/shared/utils/formatters.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';
import { haveAllCompleted, waitForEmailJobs } from '../support/email-jobs.ts';

const MAILPIT_API = `${env.smtp.mailpitUrl}/api/v1`;

interface MailpitSummary {
  ID: string;
  To: Array<{ Address: string }>;
  Subject: string;
}

interface MailpitMessage {
  Subject: string;
  Text: string;
  HTML: string;
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

When(
  'the email sender has sent the queued emails to {string}',
  async function (this: ICustomWorld, name: string) {
    const { email } = getUser(this, name);
    const jobs = await waitForEmailJobs(this.server, [email], haveAllCompleted);
    assert.ok(jobs, `The send-email jobs to ${email} did not all complete within 10s`);
  },
);

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
    const line = modelCommentLiterals.formatGroupLine(
      formatUserList(actors, actors.length),
      modelTitle,
    );
    const message = await findOnlyMessageTo(getUser(this, name).email);
    assert.ok(message.Text.includes(line), `the digest text does not contain "${line}"`);
  },
);

Given(
  'the model {string} has a public preview image',
  async function (this: ICustomWorld, title: string) {
    const modelId = (this.context['models'] as Map<string, string> | undefined)?.get(title);
    assert.ok(modelId, `no model "${title}"`);
    const { prisma } = this.server.diContainer.cradle;
    await prisma.modelVersion.updateMany({
      where: { modelId },
      data: { previewImageFileKey: `${PUBLIC_PREFIX}/e2e/${modelId}.png` },
    });
    this.context['previewImageKeys'] = {
      ...(this.context['previewImageKeys'] as Record<string, string> | undefined),
      [title]: `${PUBLIC_PREFIX}/e2e/${modelId}.png`,
    };
  },
);

Then(
  'the Mailpit message to {string} should show {string} with its preview image',
  async function (this: ICustomWorld, name: string, title: string) {
    const key = (this.context['previewImageKeys'] as Record<string, string> | undefined)?.[title];
    assert.ok(key, `no preview image for "${title}"`);
    const { fileService } = this.server.diContainer.cradle;
    const imageUrl = fileService.getPublicUrl(key);
    assert.ok(imageUrl, `the preview image key ${key} is not public`);
    const message = await findOnlyMessageTo(getUser(this, name).email);
    assert.ok(message.Subject.includes(title), `the subject does not name "${title}"`);
    assert.ok(message.HTML.includes(title), `the html does not name "${title}"`);
    assert.ok(message.HTML.includes(`src="${imageUrl}"`), `the html has no image ${imageUrl}`);
  },
);

Then(
  'the Mailpit message to {string} should not mention {string}',
  async function (this: ICustomWorld, name: string, text: string) {
    const message = await findOnlyMessageTo(getUser(this, name).email);
    for (const [part, content] of Object.entries({
      subject: message.Subject,
      html: message.HTML,
      text: message.Text,
    })) {
      assert.ok(!content.includes(text), `the ${part} mentions "${text}"`);
    }
  },
);

Then(
  'the Mailpit message to {string} should not show the preview image of {string}',
  async function (this: ICustomWorld, name: string, title: string) {
    const key = (this.context['previewImageKeys'] as Record<string, string> | undefined)?.[title];
    assert.ok(key, `no preview image for "${title}"`);
    const message = await findOnlyMessageTo(getUser(this, name).email);
    assert.ok(!message.HTML.includes(key), `the html shows the preview image ${key}`);
  },
);
