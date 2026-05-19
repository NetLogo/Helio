import assert from 'node:assert';
import { Then, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

function getModels(context: Record<string, unknown>): Map<string, string> {
  if (!context['models']) context['models'] = new Map<string, string>();
  return context['models'] as Map<string, string>;
}

function getAdditionalFiles(context: Record<string, unknown>): Map<string, string> {
  if (!context['additionalFiles']) context['additionalFiles'] = new Map<string, string>();
  return context['additionalFiles'] as Map<string, string>;
}

function buildSingleFileMultipart(opts: {
  fieldName?: string;
  filename: string;
  contentType: string;
  payload: Buffer;
}): { payload: Buffer; contentType: string } {
  const boundary = `----SecBoundary${Date.now().toString(16)}${Math.random().toString(16).slice(2, 6)}`;
  const field = opts.fieldName ?? 'file';
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${field}"; filename="${opts.filename}"\r\n` +
      `Content-Type: ${opts.contentType}\r\n\r\n`,
    'utf-8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  return {
    payload: Buffer.concat([head, opts.payload, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

When(
  'an anonymous viewer sends a GET request to {string}',
  async function (this: ICustomWorld, url: string) {
    this.context.latestResponse = await this.server.inject({ method: 'GET', url });
  },
);

When(
  'an anonymous viewer sends a POST request to {string}',
  async function (this: ICustomWorld, url: string) {
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url,
      payload: {},
      headers: { 'content-type': 'application/json' },
    });
  },
);

Then(
  'the response status should not be {int}',
  function (this: ICustomWorld, statusCode: number) {
    assert.notStrictEqual(
      this.context.latestResponse!.statusCode,
      statusCode,
      `Expected status to NOT be ${statusCode}, but it was`,
    );
  },
);

When(
  'the current user PATCHes their own profile with JSON body:',
  async function (this: ICustomWorld, body: string) {
    const user = this.context['currentUser'] as TestUser;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/users/${user.id}`,
      payload: JSON.parse(body),
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When('the current user fetches their own profile', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: `/api/v1/users/${user.id}`,
    headers: { cookie: user.cookie },
  });
});

When(
  'the current user fetches {string} with their old cookie',
  async function (this: ICustomWorld, url: string) {
    const user = this.context['currentUser'] as TestUser;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url,
      headers: { cookie: user.cookie },
    });
  },
);

When(
  'I upload an avatar declared {string} with an SVG payload',
  async function (this: ICustomWorld, mime: string) {
    const user = this.context['currentUser'] as TestUser;
    const svg = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      'utf-8',
    );
    const { payload, contentType } = buildSingleFileMultipart({
      filename: 'avatar.png',
      contentType: mime,
      payload: svg,
    });
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: '/api/v1/uploads/avatar',
      payload,
      headers: { cookie: user.cookie, 'content-type': contentType },
    });
  },
);

When(
  '{string} uploads an additional file declared {string} with body {string} to {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    mime: string,
    body: string,
    modelTitle: string,
  ) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const ext = mime === 'application/javascript' ? 'js' : 'html';
    const { payload, contentType } = buildSingleFileMultipart({
      filename: `payload.${ext}`,
      contentType: mime,
      payload: Buffer.from(body, 'utf-8'),
    });
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/additional-files`,
      payload,
      headers: { cookie: actor.cookie, 'content-type': contentType },
    });
  },
);

When(
  '{string} deletes additional file {string} using the modelId of {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    fileLabel: string,
    modelTitle: string,
  ) {
    const actor = getUsers(this.context).get(actorName)!;
    const otherModelId = getModels(this.context).get(modelTitle)!;
    const fileId = getAdditionalFiles(this.context).get(fileLabel)!;
    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${otherModelId}/additional-files/${fileId}`,
      headers: { cookie: actor.cookie },
    });
  },
);
