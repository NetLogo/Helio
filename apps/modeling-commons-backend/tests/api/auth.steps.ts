import assert from 'node:assert';
import { Given, When, Then } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import { signUp } from '../support/auth-helper.ts';

interface PrismaCradle {
  prisma: {
    user: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      findFirst: (args: {
        where: Record<string, unknown>;
        include?: Record<string, unknown>;
      }) => Promise<{ id: string; accounts: unknown[] } | null>;
    };
  };
}

let legacyIdCounter = 0;

Given(
  'a registered user with email {string}',
  async function (this: ICustomWorld, email: string) {
    await signUp(this.server, { email });
  },
);

Given(
  'a legacy user with email {string} and no linked account',
  async function (this: ICustomWorld, email: string) {
    const { prisma } = this.server.diContainer.cradle as unknown as PrismaCradle;
    await prisma.user.create({
      data: {
        name: 'Legacy User',
        email,
        emailVerified: true,
        legacyId: ++legacyIdCounter,
      },
    });
  },
);

Given(
  'a verified user with email {string} and password {string}',
  async function (this: ICustomWorld, email: string, password: string) {
    await signUp(this.server, { email, password });
  },
);

When(
  'I sign up with name {string} email {string} and password {string}',
  async function (this: ICustomWorld, name: string, email: string, password: string) {
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { name, email, password },
      headers: { 'content-type': 'application/json' },
    });
  },
);

When(
  'I sign in with email {string} and password {string}',
  async function (this: ICustomWorld, email: string, password: string) {
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email, password },
      headers: { 'content-type': 'application/json' },
    });
  },
);

Then(
  'the response should include a session cookie',
  function (this: ICustomWorld) {
    const setCookie = this.context.latestResponse!.headers['set-cookie'];
    assert.ok(setCookie, 'Expected set-cookie header in response');
  },
);

Then(
  'the signup should be rejected',
  function (this: ICustomWorld) {
    const code = this.context.latestResponse!.statusCode;
    assert.ok(code >= 400, `Expected error status code, got ${code}`);
  },
);

Then(
  'the signin should be rejected',
  function (this: ICustomWorld) {
    const code = this.context.latestResponse!.statusCode;
    assert.ok(code >= 400, `Expected error status code, got ${code}`);
  },
);

async function findAccountCount(this: ICustomWorld, email: string): Promise<number> {
  const { prisma } = this.server.diContainer.cradle as unknown as PrismaCradle;
  const user = await prisma.user.findFirst({ where: { email }, include: { accounts: true } });
  assert.ok(user, `Expected a user with email "${email}"`);
  return user.accounts.length;
}

Then(
  'the user {string} should still have no linked account',
  async function (this: ICustomWorld, email: string) {
    const count = await findAccountCount.call(this, email);
    assert.strictEqual(count, 0, `Expected no linked account, found ${count}`);
  },
);

Then(
  'the user {string} should have a linked account',
  async function (this: ICustomWorld, email: string) {
    const count = await findAccountCount.call(this, email);
    assert.ok(count > 0, 'Expected a linked account, found none');
  },
);
