import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

function getModels(context: Record<string, unknown>): Map<string, string> {
  return context['models'] as Map<string, string>;
}

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  return context['users'] as Map<string, TestUser>;
}

function getVersions(context: Record<string, unknown>): Map<string, number> {
  if (!context['versions']) context['versions'] = new Map<string, number>();
  return context['versions'] as Map<string, number>;
}

function buildVersionMultipart(
  title?: string,
  description?: string,
): { payload: Buffer; contentType: string } {
  const boundary = `----CucumberBoundary${Date.now().toString(16)}`;
  const parts: string[] = [
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="model.nlogox"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `; auto-generated test content\nto setup\nclear-all\nend\n\r\n`,
  ];
  if (title !== undefined) {
    parts.push(
      `--${boundary}\r\n` + `Content-Disposition: form-data; name="title"\r\n\r\n` + `${title}\r\n`,
    );
  }
  if (description !== undefined) {
    parts.push(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="description"\r\n\r\n` +
        `${description}\r\n`,
    );
  }
  parts.push(`--${boundary}--\r\n`);
  return {
    payload: Buffer.from(parts.join(''), 'utf-8'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

Given(
  'a version {string} for {string} with title {string}',
  async function (this: ICustomWorld, versionKey: string, modelTitle: string, title: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const { payload, contentType } = buildVersionMultipart(title);
    const res = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/versions`,
      payload,
      headers: { cookie: user.cookie, 'content-type': contentType },
    });
    if (res.statusCode !== 201) {
      throw new Error(`Failed to create version (${res.statusCode}): ${res.body}`);
    }
    const versionNumber = JSON.parse(res.body).versionNumber;
    getVersions(this.context).set(`${modelTitle}:${versionKey}`, versionNumber);
  },
);

When(
  'I create a version for {string} with title {string}',
  async function (this: ICustomWorld, modelTitle: string, title: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const { payload, contentType } = buildVersionMultipart(title);
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/versions`,
      payload,
      headers: { cookie: user.cookie, 'content-type': contentType },
    });
  },
);

When(
  '{string} creates a version for {string} with title {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string, title: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const { payload, contentType } = buildVersionMultipart(title);
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/versions`,
      payload,
      headers: { cookie: actor.cookie, 'content-type': contentType },
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
