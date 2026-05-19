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

function buildPrimaryFileMultipart(content: string): { payload: Buffer; contentType: string } {
  const boundary = `----CucumberBoundary${Date.now().toString(16)}`;
  const parts = [
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="model.nlogo"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${content}\r\n`,
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="role"\r\n\r\n` +
      `primary\r\n`,
    `--${boundary}--\r\n`,
  ];
  return {
    payload: Buffer.from(parts.join(''), 'utf-8'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function createModel(
  server: import('fastify').FastifyInstance,
  user: TestUser,
  title: string,
  visibility: string = 'public',
  parentModelId?: string,
): Promise<string> {
  const draftBody: Record<string, unknown> = {};
  if (parentModelId) draftBody['modelId'] = parentModelId;

  const draftRes = await server.inject({
    method: 'POST',
    url: '/api/v1/model-drafts',
    payload: draftBody,
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });
  if (draftRes.statusCode !== 201) {
    throw new Error(`Failed to create draft (${draftRes.statusCode}): ${draftRes.body}`);
  }
  const draftId = JSON.parse(draftRes.body).id;

  const patchRes = await server.inject({
    method: 'PATCH',
    url: `/api/v1/model-drafts/${draftId}`,
    payload: { title, visibility },
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });
  if (patchRes.statusCode !== 204) {
    throw new Error(`Failed to patch draft (${patchRes.statusCode}): ${patchRes.body}`);
  }

  if (!parentModelId) {
    const { payload, contentType } = buildPrimaryFileMultipart(
      `; ${title}\nto setup\nclear-all\nend\n`,
    );
    const uploadRes = await server.inject({
      method: 'POST',
      url: `/api/v1/model-drafts/${draftId}/files`,
      payload,
      headers: { cookie: user.cookie, 'content-type': contentType },
    });
    if (uploadRes.statusCode !== 201) {
      throw new Error(`Failed to upload primary file (${uploadRes.statusCode}): ${uploadRes.body}`);
    }
  }

  const publishRes = await server.inject({
    method: 'POST',
    url: `/api/v1/model-drafts/${draftId}/publish`,
    headers: { cookie: user.cookie },
  });
  if (publishRes.statusCode !== 201) {
    throw new Error(`Failed to publish draft (${publishRes.statusCode}): ${publishRes.body}`);
  }
  return JSON.parse(publishRes.body).modelId;
}

When(
  'I send a POST request to {string} with JSON body:',
  async function (this: ICustomWorld, url: string, body: string) {
    const cookie = this.context['currentCookie'] as string | undefined;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url,
      payload: JSON.parse(body),
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
    });
  },
);

When('I create a model with title {string}', async function (this: ICustomWorld, title: string) {
  const user = this.context['currentUser'] as TestUser;
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: '/api/v1/models',
    payload: { title },
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });
  if (this.context.latestResponse.statusCode === 201) {
    const id = JSON.parse(this.context.latestResponse.body).id;
    getModels(this.context).set(title, id);
  }
});

Given(
  'a public model {string} created by the current user',
  async function (this: ICustomWorld, title: string) {
    const user = this.context['currentUser'] as TestUser;
    const id = await createModel(this.server, user, title, 'public');
    getModels(this.context).set(title, id);
  },
);

Given(
  'a public model {string} created by {string}',
  async function (this: ICustomWorld, title: string, ownerName: string) {
    const owner = getUsers(this.context).get(ownerName)!;
    const id = await createModel(this.server, owner, title, 'public');
    getModels(this.context).set(title, id);
  },
);

Given(
  'a private model {string} created by the current user',
  async function (this: ICustomWorld, title: string) {
    const user = this.context['currentUser'] as TestUser;
    const id = await createModel(this.server, user, title, 'private');
    getModels(this.context).set(title, id);
  },
);

Given(
  'a private model {string} created by {string}',
  async function (this: ICustomWorld, title: string, ownerName: string) {
    const owner = getUsers(this.context).get(ownerName)!;
    const id = await createModel(this.server, owner, title, 'private');
    getModels(this.context).set(title, id);
  },
);

Given(
  'an unlisted model {string} created by {string}',
  async function (this: ICustomWorld, title: string, ownerName: string) {
    const owner = getUsers(this.context).get(ownerName)!;
    const id = await createModel(this.server, owner, title, 'unlisted');
    getModels(this.context).set(title, id);
  },
);

When(
  '{string} sends a GET request to {string}',
  async function (this: ICustomWorld, actorName: string, url: string) {
    const actor = getUsers(this.context).get(actorName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url,
      headers: { cookie: actor.cookie },
    });
  },
);

When('I get the model {string}', async function (this: ICustomWorld, title: string) {
  const modelId = getModels(this.context).get(title)!;
  const user = this.context['currentUser'] as TestUser | undefined;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: `/api/v1/models/${modelId}`,
    ...(user ? { headers: { cookie: user.cookie } } : {}),
  });
});

When(
  '{string} gets the model {string}',
  async function (this: ICustomWorld, actorName: string, title: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(title)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  'I update the model {string} with visibility {string}',
  async function (this: ICustomWorld, title: string, visibility: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(title)!;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/models/${modelId}`,
      payload: { visibility },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When('I delete the model {string}', async function (this: ICustomWorld, title: string) {
  const user = this.context['currentUser'] as TestUser;
  const modelId = getModels(this.context).get(title)!;
  this.context.latestResponse = await this.server.inject({
    method: 'DELETE',
    url: `/api/v1/models/${modelId}`,
    headers: { cookie: user.cookie },
  });
});

When(
  '{string} gets permissions for model {string}',
  async function (this: ICustomWorld, userName: string, title: string) {
    const user = getUsers(this.context).get(userName)!;
    const modelId = getModels(this.context).get(title)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/me/permissions`,
      headers: { cookie: user.cookie },
    });
  },
);

When(
  'an anonymous viewer gets permissions for model {string}',
  async function (this: ICustomWorld, title: string) {
    const modelId = getModels(this.context).get(title)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/me/permissions`,
    });
  },
);

Then(
  'the response permissions action {string} should be {word}',
  function (this: ICustomWorld, actionKey: string, expected: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const expectedBool = expected === 'true';
    assert.strictEqual(
      body[actionKey],
      expectedBool,
      `Expected ${actionKey} to be ${expectedBool}, got ${body[actionKey]}`,
    );
  },
);

When(
  'I fork the model {string} with title {string}',
  async function (this: ICustomWorld, originalTitle: string, forkTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const parentModelId = getModels(this.context).get(originalTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: '/api/v1/models',
      payload: { title: forkTitle, parentModelId },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
    if (this.context.latestResponse.statusCode === 201) {
      const id = JSON.parse(this.context.latestResponse.body).id;
      getModels(this.context).set(forkTitle, id);
    }
  },
);
