import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import { createAuthenticatedUser, makeAdmin, type TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

Given(
  'an authenticated admin user {string}',
  async function (this: ICustomWorld, name: string) {
    const user = await createAuthenticatedUser(this.server, { name });
    await makeAdmin(this.server, user.id);
    getUsers(this.context).set(name, user);
    this.context['currentUser'] = user;
    this.context['currentCookie'] = user.cookie;
  },
);

When(
  '{string} lists admin events',
  async function (this: ICustomWorld, actorName: string) {
    const actor = getUsers(this.context).get(actorName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: '/api/v1/admin/events',
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} lists admin events with type {string}',
  async function (this: ICustomWorld, actorName: string, eventType: string) {
    const actor = getUsers(this.context).get(actorName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/admin/events?type=${encodeURIComponent(eventType)}`,
      headers: { cookie: actor.cookie },
    });
  },
);
