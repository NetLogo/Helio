import { Given, When } from '@cucumber/cucumber';
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

function buildAdditionalFileMultipart(content: string): {
  payload: Buffer;
  contentType: string;
} {
  const boundary = `----AddFileBoundary${Date.now().toString(16)}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="data.csv"\r\n` +
      `Content-Type: text/csv\r\n\r\n`,
    'utf-8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  return {
    payload: Buffer.concat([head, Buffer.from(content, 'utf-8'), tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function uploadAdditionalFile(
  server: import('fastify').FastifyInstance,
  cookie: string | undefined,
  modelId: string,
) {
  const { payload, contentType } = buildAdditionalFileMultipart('col1,col2\n1,2\n');
  return server.inject({
    method: 'POST',
    url: `/api/v1/models/${modelId}/additional-files`,
    payload,
    headers: {
      'content-type': contentType,
      ...(cookie ? { cookie } : {}),
    },
  });
}

When(
  'I list additional files for {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser | undefined;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/additional-files`,
      ...(user ? { headers: { cookie: user.cookie } } : {}),
    });
  },
);

When(
  'I list additional files for {string} tagged at version {int}',
  async function (this: ICustomWorld, modelTitle: string, versionNumber: number) {
    const user = this.context['currentUser'] as TestUser | undefined;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/additional-files?taggedVersionNumber=${versionNumber}`,
      ...(user ? { headers: { cookie: user.cookie } } : {}),
    });
  },
);

When(
  '{string} lists additional files for {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/additional-files`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  'an anonymous viewer uploads an additional file to {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await uploadAdditionalFile(this.server, undefined, modelId);
  },
);

When(
  '{string} uploads an additional file to {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await uploadAdditionalFile(this.server, actor.cookie, modelId);
  },
);

Given(
  '{string} has uploaded an additional file to {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await uploadAdditionalFile(this.server, actor.cookie, modelId);
    if (res.statusCode !== 201) {
      throw new Error(`Failed to seed additional file (${res.statusCode}): ${res.body}`);
    }
  },
);

function getAdditionalFiles(context: Record<string, unknown>): Map<string, string> {
  if (!context['additionalFiles']) context['additionalFiles'] = new Map<string, string>();
  return context['additionalFiles'] as Map<string, string>;
}

Given(
  '{string} has uploaded an additional file {string} to {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    fileLabel: string,
    modelTitle: string,
  ) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await uploadAdditionalFile(this.server, actor.cookie, modelId);
    if (res.statusCode !== 201) {
      throw new Error(`Failed to seed additional file (${res.statusCode}): ${res.body}`);
    }
    const body = JSON.parse(res.body) as { id: string };
    getAdditionalFiles(this.context).set(fileLabel, body.id);
  },
);

When(
  '{string} deletes additional file {string} from {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    fileLabel: string,
    modelTitle: string,
  ) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const fileId = getAdditionalFiles(this.context).get(fileLabel)!;
    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/additional-files/${fileId}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  'an anonymous viewer deletes additional file {string} from {string}',
  async function (this: ICustomWorld, fileLabel: string, modelTitle: string) {
    const modelId = getModels(this.context).get(modelTitle)!;
    const fileId = getAdditionalFiles(this.context).get(fileLabel)!;
    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/additional-files/${fileId}`,
    });
  },
);
