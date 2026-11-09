import assert from 'node:assert';
import { Given, Then, When } from '@cucumber/cucumber';
import workersConfig from '#src/config/workers.ts';
import type { ICustomWorld } from '../support/custom-world.ts';
import { createAuthenticatedUser, makeAdmin, type TestUser } from '../support/auth-helper.ts';
import { waitForEventsDispatched } from '../support/subscriber-jobs.ts';

type ListedEvent = {
  id: string;
  dispatch: Array<{ subscriber: string; state: string; attempts: number | null }>;
};

function listEvents(world: ICustomWorld): Array<ListedEvent> {
  return (world.context.latestResponse!.json() as { data: Array<ListedEvent> }).data;
}

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

Given('an authenticated admin user {string}', async function (this: ICustomWorld, name: string) {
  const user = await createAuthenticatedUser(this.server, { name });
  await makeAdmin(this.server, user.id);
  getUsers(this.context).set(name, user);
  this.context['currentUser'] = user;
  this.context['currentCookie'] = user.cookie;
});

When('{string} lists admin events', async function (this: ICustomWorld, actorName: string) {
  const actor = getUsers(this.context).get(actorName)!;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: '/api/v1/admin/events',
    headers: { cookie: actor.cookie },
  });
});

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

When(
  '{string} lists admin events with resourceType {string}',
  async function (this: ICustomWorld, actorName: string, resourceType: string) {
    const actor = getUsers(this.context).get(actorName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/admin/events?resourceType=${encodeURIComponent(resourceType)}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} lists admin events with dispatchState {string}',
  async function (this: ICustomWorld, actorName: string, dispatchState: string) {
    const actor = getUsers(this.context).get(actorName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/admin/events?dispatchState=${encodeURIComponent(dispatchState)}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When('the pending events have been dispatched', async function (this: ICustomWorld) {
  await waitForEventsDispatched(this.server);
});

When('one user-notifications job is waiting to retry', async function (this: ICustomWorld) {
  const { jobQueue } = this.server.diContainer.cradle;
  const { queueName } = workersConfig.userNotifications;
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const retrying = await jobQueue.findJobValues(queueName, 'eventId', 'retry');
    if (retrying.length === 1) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('No user-notifications job reached the retry state within 10s');
});

Then(
  'every listed event should report dispatch state {string} after {int} attempt(s)',
  function (this: ICustomWorld, state: string, attempts: number) {
    const events = listEvents(this);
    assert.ok(events.length > 0, 'expected the admin event list to contain events');
    for (const event of events) {
      assert.ok(event.dispatch.length > 0, `event ${event.id} reports no dispatch`);
      for (const dispatch of event.dispatch) {
        assert.deepStrictEqual(
          { state: dispatch.state, attempts: dispatch.attempts },
          { state, attempts },
          `event ${event.id}, subscriber ${dispatch.subscriber}`,
        );
      }
    }
  },
);

Then(
  'every listed event should report the subscribers {string}',
  function (this: ICustomWorld, subscribers: string) {
    const expected = subscribers.split(',').map((name) => name.trim());
    const events = listEvents(this);
    assert.ok(events.length > 0, 'expected the admin event list to contain events');
    for (const event of events) {
      assert.deepStrictEqual(
        event.dispatch.map((dispatch) => dispatch.subscriber),
        expected,
        `event ${event.id}`,
      );
    }
  },
);

Then(
  'the admin event list should contain {int} event(s) in dispatch state {string}',
  function (this: ICustomWorld, count: number, state: string) {
    const events = listEvents(this);
    assert.strictEqual(events.length, count);
    for (const event of events) {
      assert.ok(
        event.dispatch.some((dispatch) => dispatch.state === state),
        `event ${event.id} has no subscriber in state ${state}`,
      );
    }
  },
);
