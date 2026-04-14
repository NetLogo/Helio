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

async function createModel(
  server: import('fastify').FastifyInstance,
  user: TestUser,
  title: string,
  visibility: string = 'public',
  parentModelId?: string,
): Promise<string> {
  const payload: Record<string, unknown> = { title, visibility };
  if (parentModelId) payload['parentModelId'] = parentModelId;

  const res = await server.inject({
    method: 'POST',
    url: '/api/v1/models',
    payload,
    headers: { cookie: user.cookie, 'content-type': 'application/json' },
  });

  if (res.statusCode !== 201) {
    throw new Error(`Failed to create model (${res.statusCode}): ${res.body}`);
  }

  const modelId = JSON.parse(res.body).id;

  // The model service doesn't create a ModelAuthor record, so seed it manually
  const { prisma } = server.diContainer.cradle as {
    prisma: { modelAuthor: { create: Function } };
  };
  await prisma.modelAuthor.create({
    data: { modelId, userId: user.id, role: 'owner' },
  });

  return modelId;
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
