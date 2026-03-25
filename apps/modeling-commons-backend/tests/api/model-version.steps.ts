import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

function getModels(context: Record<string, unknown>): Map<string, string> {
  return context['models'] as Map<string, string>;
}

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  return context['users'] as Map<string, TestUser>;
}

function getVersions(context: Record<string, unknown>): Map<string, string> {
  if (!context['versions']) context['versions'] = new Map<string, string>();
  return context['versions'] as Map<string, string>;
}

function resolveUser(context: Record<string, unknown>, name?: string): TestUser {
  if (name) return getUsers(context).get(name)!;
  return context['currentUser'] as TestUser;
}

Given(
  'a version {string} for {string} with title {string}',
  async function (this: ICustomWorld, versionKey: string, modelTitle: string, title: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/versions`,
      payload: { title },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
    if (res.statusCode !== 201) {
      throw new Error(`Failed to create version (${res.statusCode}): ${res.body}`);
    }
    const id = JSON.parse(res.body).id;
    getVersions(this.context).set(`${modelTitle}:${versionKey}`, id);
  },
);

When(
  'I create a version for {string} with title {string}',
  async function (this: ICustomWorld, modelTitle: string, title: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/versions`,
      payload: { title },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When(
  '{string} creates a version for {string} with title {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string, title: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/versions`,
      payload: { title },
      headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    });
  },
);

When('I list versions of the model {string}', async function (this: ICustomWorld, title: string) {
  const user = this.context['currentUser'] as TestUser;
  const modelId = getModels(this.context).get(title)!;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: `/api/v1/models/${modelId}/versions`,
    headers: { cookie: user.cookie },
  });
});

When(
  'I get version {int} of the model {string}',
  async function (this: ICustomWorld, version: number, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/versions/${version}`,
      headers: { cookie: user.cookie },
    });
  },
);

When(
  'I update the current version of {string} with title {string}',
  async function (this: ICustomWorld, modelTitle: string, versionTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/models/${modelId}/versions/current`,
      payload: { title: versionTitle },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When(
  'I update the current version of {string} with description {string}',
  async function (this: ICustomWorld, modelTitle: string, description: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/models/${modelId}/versions/current`,
      payload: { description },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When(
  '{string} lists versions of the model {string}',
  async function (this: ICustomWorld, actorName: string, title: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(title)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/versions`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} updates the current version of {string} with title {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string, title: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/models/${modelId}/versions/current`,
      payload: { title },
      headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    });
  },
);
