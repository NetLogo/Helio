import { Given, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import { createAuthenticatedUser, type TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

Given('an authenticated user', async function (this: ICustomWorld) {
  const user = await createAuthenticatedUser(this.server);
  this.context['currentUser'] = user;
  this.context['currentCookie'] = user.cookie;
});

Given('an authenticated user {string}', async function (this: ICustomWorld, name: string) {
  const user = await createAuthenticatedUser(this.server, { name });
  getUsers(this.context).set(name, user);
  this.context['currentUser'] = user;
  this.context['currentCookie'] = user.cookie;
});

When("I get the current user's profile", async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: `/api/v1/users/${user.id}`,
    headers: { cookie: user.cookie },
  });
});

When(
  'I update the current user with userKind {string}',
  async function (this: ICustomWorld, userKind: string) {
    const user = this.context['currentUser'] as TestUser;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/users/${user.id}`,
      payload: { userKind },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When("I delete the current user's account", async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  this.context.latestResponse = await this.server.inject({
    method: 'DELETE',
    url: `/api/v1/users/${user.id}`,
    headers: { cookie: user.cookie },
  });
});

When(
  'I send a PATCH request to {string} with body:',
  async function (this: ICustomWorld, url: string, dataTable: DataTable) {
    const rows = dataTable.raw();
    const body: Record<string, string> = {};
    for (const [key, value] of rows) {
      body[key] = value;
    }
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url,
      payload: body,
      headers: { 'content-type': 'application/json' },
    });
  },
);

When(
  '{string} updates {string} with userKind {string}',
  async function (this: ICustomWorld, actorName: string, targetName: string, userKind: string) {
    const users = getUsers(this.context);
    const actor = users.get(actorName)!;
    const target = users.get(targetName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/users/${target.id}`,
      payload: { userKind },
      headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    });
  },
);

Given(
  '{string} sets their profile to private',
  async function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/users/${user.id}`,
      payload: { isProfilePublic: false },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

Given(
  '{string} sets their profile to public',
  async function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/users/${user.id}`,
      payload: { isProfilePublic: true },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When(
  '{string} gets the profile of {string}',
  async function (this: ICustomWorld, actorName: string, targetName: string) {
    const users = getUsers(this.context);
    const actor = users.get(actorName)!;
    const target = users.get(targetName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/users/${target.id}`,
      headers: { cookie: actor.cookie },
    });
  },
);
