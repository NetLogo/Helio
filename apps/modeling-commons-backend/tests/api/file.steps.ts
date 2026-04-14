import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';
import { signDownloadToken } from '../../src/shared/services/signed-url.service.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

function getModels(context: Record<string, unknown>): Map<string, string> {
  if (!context['models']) context['models'] = new Map<string, string>();
  return context['models'] as Map<string, string>;
}

function getFileIds(context: Record<string, unknown>): Map<string, string> {
  if (!context['fileIds']) context['fileIds'] = new Map<string, string>();
  return context['fileIds'] as Map<string, string>;
}

async function createModelWithFile(
  server: import('fastify').FastifyInstance,
  user: TestUser,
  title: string,
  visibility: string,
): Promise<{ modelId: string; fileId: string }> {
  const createRes = await server.inject({
    method: 'POST',
    url: '/api/v1/models',
    payload: { title, visibility },
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });
  if (createRes.statusCode !== 201) {
    throw new Error(`Failed to create model (${createRes.statusCode}): ${createRes.body}`);
  }
  const modelId = JSON.parse(createRes.body).id;

  const { prisma } = server.diContainer.cradle as {
    prisma: {
      modelAuthor: { create: Function };
      file: { create: Function };
      modelVersion: { create: Function };
      model: { update: Function };
    };
  };
  await prisma.modelAuthor.create({
    data: { modelId, userId: user.id, role: 'owner' },
  });

  const { randomUUID: uuid } = await import('node:crypto');
  const fileId = uuid();
  await prisma.file.create({
    data: {
      id: fileId,
      filename: 'test.nlogox',
      contentType: 'application/octet-stream',
      sizeBytes: 4,
      blob: Buffer.from('test'),
    },
  });

  await prisma.modelVersion.create({
    data: {
      modelId,
      versionNumber: 1,
      title,
      nlogoxFileId: fileId,
    },
  });
  await prisma.model.update({
    where: { id: modelId },
    data: { latestVersionNumber: 1 },
  });

  return { modelId, fileId };
}

Given(
  'a public model {string} created by {string} with a file',
  async function (this: ICustomWorld, title: string, ownerName: string) {
    const owner = getUsers(this.context).get(ownerName)!;
    const { modelId, fileId } = await createModelWithFile(this.server, owner, title, 'public');
    getModels(this.context).set(title, modelId);
    getFileIds(this.context).set(title, fileId);
  },
);

Given(
  'a private model {string} created by {string} with a file',
  async function (this: ICustomWorld, title: string, ownerName: string) {
    const owner = getUsers(this.context).get(ownerName)!;
    const { modelId, fileId } = await createModelWithFile(this.server, owner, title, 'private');
    getModels(this.context).set(title, modelId);
    getFileIds(this.context).set(title, fileId);
  },
);

When(
  'I download the file for {string} with a signed token',
  async function (this: ICustomWorld, modelTitle: string) {
    const fileId = getFileIds(this.context).get(modelTitle)!;
    const token = signDownloadToken(fileId);
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/files/${fileId}/download?token=${token}`,
    });
  },
);

When(
  'I download the file for {string} with an expired token',
  async function (this: ICustomWorld, modelTitle: string) {
    const fileId = getFileIds(this.context).get(modelTitle)!;
    const token = signDownloadToken(fileId, -1);
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/files/${fileId}/download?token=${token}`,
    });
  },
);

When(
  'I download the file for {string} without auth',
  async function (this: ICustomWorld, modelTitle: string) {
    const fileId = getFileIds(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/files/${fileId}/download`,
    });
  },
);

When(
  '{string} downloads the file for {string} with auth',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const fileId = getFileIds(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/files/${fileId}/download`,
      headers: { cookie: actor.cookie },
    });
  },
);
