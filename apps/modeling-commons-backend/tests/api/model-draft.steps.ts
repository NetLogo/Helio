import assert from 'node:assert';
import { Given, Then, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import { type TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

function getDrafts(context: Record<string, unknown>): Map<string, string> {
  if (!context['drafts']) context['drafts'] = new Map<string, string>();
  return context['drafts'] as Map<string, string>;
}

function buildPrimaryFileMultipart(content: string): { payload: Buffer; contentType: string } {
  const boundary = `----DraftBoundary${Date.now().toString(16)}`;
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

function buildModelFileMultipart(content: string): { payload: Buffer; contentType: string } {
  const boundary = `----DraftBoundary${Date.now().toString(16)}`;
  const parts = [
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="model.nlogox"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${content}\r\n`,
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="role"\r\n\r\n` +
      `model-file\r\n`,
    `--${boundary}--\r\n`,
  ];
  return {
    payload: Buffer.from(parts.join(''), 'utf-8'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function buildAttachmentFileMultipart(content: string): { payload: Buffer; contentType: string } {
  const boundary = `----DraftBoundary${Date.now().toString(16)}`;
  const parts = [
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="notes.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${content}\r\n`,
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="role"\r\n\r\n` +
      `attachment\r\n`,
    `--${boundary}--\r\n`,
  ];
  return {
    payload: Buffer.from(parts.join(''), 'utf-8'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function buildPreviewImageMultipart(content: string): { payload: Buffer; contentType: string } {
  const boundary = `----DraftPreviewBoundary${Date.now().toString(16)}`;
  const parts = [
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="preview.png"\r\n` +
      `Content-Type: image/png\r\n\r\n` +
      `${content}\r\n`,
    `--${boundary}\r\n` + `Content-Disposition: form-data; name="role"\r\n\r\n` + `preview\r\n`,
    `--${boundary}--\r\n`,
  ];
  return {
    payload: Buffer.from(parts.join(''), 'utf-8'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function createEmptyDraft(
  server: import('fastify').FastifyInstance,
  user: TestUser,
): Promise<string> {
  const res = await server.inject({
    method: 'POST',
    url: '/api/v1/model-drafts',
    payload: {},
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });
  if (res.statusCode !== 201) {
    throw new Error(`Failed to create draft (${res.statusCode}): ${res.body}`);
  }
  return JSON.parse(res.body).id;
}

When('I create an empty draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: '/api/v1/model-drafts',
    payload: {},
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });
  if (this.context.latestResponse.statusCode === 201) {
    const id = JSON.parse(this.context.latestResponse.body).id;
    this.context['currentDraftId'] = id;
    getDrafts(this.context).set('current', id);
  }
});

Given('an empty draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const id = await createEmptyDraft(this.server, user);
  this.context['currentDraftId'] = id;
  getDrafts(this.context).set('current', id);
});

Given(
  '{string} creates an empty draft',
  async function (this: ICustomWorld, name: string) {
    const owner = getUsers(this.context).get(name)!;
    const id = await createEmptyDraft(this.server, owner);
    getDrafts(this.context).set(name, id);
  },
);

function getModels(context: Record<string, unknown>): Map<string, string> {
  if (!context['models']) context['models'] = new Map<string, string>();
  return context['models'] as Map<string, string>;
}

Given(
  'a draft seeded from the model {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await this.server.inject({
      method: 'POST',
      url: '/api/v1/model-drafts',
      payload: { modelId },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
    if (res.statusCode !== 201) {
      throw new Error(`Failed to seed draft (${res.statusCode}): ${res.body}`);
    }
    const id = JSON.parse(res.body).id;
    this.context['currentDraftId'] = id;
    getDrafts(this.context).set('current', id);
  },
);

When(
  'I patch the draft with title {string} and visibility {string}',
  async function (this: ICustomWorld, title: string, visibility: string) {
    const user = this.context['currentUser'] as TestUser;
    const draftId = this.context['currentDraftId'] as string;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/model-drafts/${draftId}`,
      payload: { title, visibility },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When('I get the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: `/api/v1/model-drafts/${draftId}`,
    headers: { cookie: user.cookie },
  });
});

When('I list my drafts', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: '/api/v1/model-drafts',
    headers: { cookie: user.cookie },
  });
});

When(
  '{string} gets the draft owned by {string}',
  async function (this: ICustomWorld, actorName: string, ownerName: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const draftId = getDrafts(this.context).get(ownerName)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/model-drafts/${draftId}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When('I abandon the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  this.context.latestResponse = await this.server.inject({
    method: 'DELETE',
    url: `/api/v1/model-drafts/${draftId}`,
    headers: { cookie: user.cookie },
  });
});

When('I upload a primary file to the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  const { payload, contentType } = buildPrimaryFileMultipart(
    `; Test Model\nto setup\nclear-all\nend\n`,
  );
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: `/api/v1/model-drafts/${draftId}/files`,
    payload,
    headers: { cookie: user.cookie, 'content-type': contentType },
  });
});

When('I upload a model file to the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  const { payload, contentType } = buildModelFileMultipart(
    `; Test Model File\nto go\ntick\nend\n`,
  );
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: `/api/v1/model-drafts/${draftId}/files`,
    payload,
    headers: { cookie: user.cookie, 'content-type': contentType },
  });
});

When('I upload an additional file to the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  const { payload, contentType } = buildAttachmentFileMultipart('supplementary notes\n');
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: `/api/v1/model-drafts/${draftId}/files`,
    payload,
    headers: { cookie: user.cookie, 'content-type': contentType },
  });
});

When('I upload a preview image to the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  const { payload, contentType } = buildPreviewImageMultipart('fake-png-bytes');
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: `/api/v1/model-drafts/${draftId}/files`,
    payload,
    headers: { cookie: user.cookie, 'content-type': contentType },
  });
});

When('I seed a new draft from the published model', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const modelId = JSON.parse(this.context.latestResponse!.body).modelId;
  const res = await this.server.inject({
    method: 'POST',
    url: '/api/v1/model-drafts',
    payload: { modelId },
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });
  this.context.latestResponse = res;
  if (res.statusCode === 201) {
    const id = JSON.parse(res.body).id;
    this.context['currentDraftId'] = id;
    getDrafts(this.context).set('current', id);
  }
});

Then(
  'the response body property {string} should contain {string}',
  function (this: ICustomWorld, property: string, substring: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.ok(
      typeof body[property] === 'string' && body[property].includes(substring),
      `Expected "${property}" (${String(body[property])}) to contain "${substring}"`,
    );
  },
);

Then(
  'the response body property {string} should not contain {string}',
  function (this: ICustomWorld, property: string, substring: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.ok(
      typeof body[property] === 'string' && !body[property].includes(substring),
      `Expected "${property}" (${String(body[property])}) to not contain "${substring}"`,
    );
  },
);

When('I publish the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: `/api/v1/model-drafts/${draftId}/publish`,
    headers: { cookie: user.cookie },
  });
});

Then(
  'the response body property {string} should not be empty',
  function (this: ICustomWorld, property: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.ok(body[property], `Expected "${property}" to be non-empty`);
  },
);

Then(
  'the draft response should have data title equal to {string}',
  function (this: ICustomWorld, expected: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.strictEqual(body.data?.title, expected);
  },
);

When(
  '{string} creates a draft targeting the model {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: '/api/v1/model-drafts',
      payload: { modelId },
      headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    });
  },
);

Then(
  'the model {string} latest version number should be {int}',
  async function (this: ICustomWorld, modelTitle: string, expected: number) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}`,
      headers: { cookie: user.cookie },
    });
    assert.strictEqual(res.statusCode, 200, `Failed to fetch model (${res.statusCode}): ${res.body}`);
    const body = JSON.parse(res.body);
    assert.strictEqual(
      body.latestVersionNumber,
      expected,
      `Expected latestVersionNumber ${expected}, got ${body.latestVersionNumber}`,
    );
  },
);
