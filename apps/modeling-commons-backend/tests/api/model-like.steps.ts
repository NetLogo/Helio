import assert from 'node:assert';
import { Given, Then, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import { type TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

function getModels(context: Record<string, unknown>): Map<string, string> {
  if (!context['models']) context['models'] = new Map<string, string>();
  return context['models'] as Map<string, string>;
}

async function likeAs(
  server: import('fastify').FastifyInstance,
  user: TestUser,
  modelId: string,
) {
  return server.inject({
    method: 'POST',
    url: `/api/v1/models/${modelId}/like`,
    headers: { cookie: user.cookie },
  });
}

When(
  '{string} likes {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await likeAs(this.server, actor, modelId);
  },
);

When(
  'an anonymous viewer likes {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/like`,
    });
  },
);

When(
  '{string} unlikes {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/like`,
      headers: { cookie: actor.cookie },
    });
  },
);

Given(
  '{string} has liked {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await likeAs(this.server, actor, modelId);
    if (res.statusCode !== 204) {
      throw new Error(`Failed to seed like (${res.statusCode}): ${res.body}`);
    }
  },
);

When(
  'I get the like summary for {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser | undefined;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/likes`,
      ...(user ? { headers: { cookie: user.cookie } } : {}),
    });
  },
);

When(
  '{string} gets the like summary for {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/likes`,
      headers: { cookie: actor.cookie },
    });
  },
);

Then(
  'the like summary count should be {int}',
  function (this: ICustomWorld, expected: number) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.strictEqual(body.count, expected);
  },
);
