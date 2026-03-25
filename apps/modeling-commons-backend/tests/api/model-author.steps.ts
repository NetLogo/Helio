import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  return context['users'] as Map<string, TestUser>;
}

function getModels(context: Record<string, unknown>): Map<string, string> {
  return context['models'] as Map<string, string>;
}

When(
  'I list authors of the model {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/authors`,
      headers: { cookie: user.cookie },
    });
  },
);

When(
  '{string} adds {string} as a contributor to {string}',
  async function (
    this: ICustomWorld,
    ownerName: string,
    contributorName: string,
    modelTitle: string,
  ) {
    const owner = getUsers(this.context).get(ownerName)!;
    const contributor = getUsers(this.context).get(contributorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/authors`,
      payload: { userId: contributor.id },
      headers: { cookie: owner.cookie, 'content-type': 'application/json' },
    });
  },
);

Given(
  '{string} has added {string} as a contributor to {string}',
  async function (
    this: ICustomWorld,
    ownerName: string,
    contributorName: string,
    modelTitle: string,
  ) {
    const owner = getUsers(this.context).get(ownerName)!;
    const contributor = getUsers(this.context).get(contributorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/authors`,
      payload: { userId: contributor.id },
      headers: { cookie: owner.cookie, 'content-type': 'application/json' },
    });
    if (res.statusCode !== 201) {
      throw new Error(`Failed to add contributor (${res.statusCode}): ${res.body}`);
    }
  },
);

When(
  '{string} removes {string} from {string}',
  async function (this: ICustomWorld, actorName: string, targetName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const target = getUsers(this.context).get(targetName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/authors/${target.id}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} transfers ownership of {string} to {string}',
  async function (this: ICustomWorld, ownerName: string, modelTitle: string, newOwnerName: string) {
    const owner = getUsers(this.context).get(ownerName)!;
    const newOwner = getUsers(this.context).get(newOwnerName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/authors/transfer`,
      payload: { newOwnerId: newOwner.id },
      headers: { cookie: owner.cookie, 'content-type': 'application/json' },
    });
  },
);

When(
  'I list models by user {string}',
  async function (this: ICustomWorld, userName: string) {
    const user = getUsers(this.context).get(userName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/users/${user.id}/models`,
    });
  },
);
