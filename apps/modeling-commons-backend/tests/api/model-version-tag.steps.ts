import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  return context['users'] as Map<string, TestUser>;
}

function getModels(context: Record<string, unknown>): Map<string, string> {
  return context['models'] as Map<string, string>;
}

function getTagIds(context: Record<string, unknown>): Map<string, string> {
  if (!context['tagIds']) context['tagIds'] = new Map<string, string>();
  return context['tagIds'] as Map<string, string>;
}

When(
  'I add tag {string} to model {string}',
  async function (this: ICustomWorld, tagName: string, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/tags`,
      payload: { name: tagName },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
    if (this.context.latestResponse.statusCode === 201) {
      const body = JSON.parse(this.context.latestResponse.body);
      getTagIds(this.context).set(`${modelTitle}:${tagName}`, body.tagId);
    }
  },
);

Given(
  'tag {string} has been added to model {string}',
  async function (this: ICustomWorld, tagName: string, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/tags`,
      payload: { name: tagName },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
    if (res.statusCode !== 201) {
      throw new Error(`Failed to add tag (${res.statusCode}): ${res.body}`);
    }
    const body = JSON.parse(res.body);
    getTagIds(this.context).set(`${modelTitle}:${tagName}`, body.tagId);
  },
);

When(
  'I remove tag {string} from model {string}',
  async function (this: ICustomWorld, tagName: string, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const tagId = getTagIds(this.context).get(`${modelTitle}:${tagName}`)!;
    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/tags/${tagId}`,
      headers: { cookie: user.cookie },
    });
  },
);

When(
  'I list tags for version {int} of model {string}',
  async function (this: ICustomWorld, version: number, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/versions/${version}/tags`,
      headers: { cookie: user.cookie },
    });
  },
);

When(
  '{string} adds tag {string} to model {string}',
  async function (this: ICustomWorld, actorName: string, tagName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/tags`,
      payload: { name: tagName },
      headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    });
  },
);
