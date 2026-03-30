import assert from 'node:assert';
import { Given, When, Then } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import { signUp, signIn } from '../support/auth-helper.ts';

Given(
  'a registered user with email {string}',
  async function (this: ICustomWorld, email: string) {
    await signUp(this.server, { email });
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
