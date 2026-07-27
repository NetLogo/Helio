import assert from 'node:assert';
import { After, Given, Then, When } from '@cucumber/cucumber';
import type { FastifyInstance } from 'fastify';
import type { ICustomWorld } from '../support/custom-world.ts';
import { type TestUser } from '../support/auth-helper.ts';

interface CommentRef {
  id: string;
  modelId: string;
}

interface MailCall {
  to: string;
}

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

function getModels(context: Record<string, unknown>): Map<string, string> {
  if (!context['models']) context['models'] = new Map<string, string>();
  return context['models'] as Map<string, string>;
}

function getComments(context: Record<string, unknown>): Map<string, CommentRef> {
  if (!context['comments']) context['comments'] = new Map<string, CommentRef>();
  return context['comments'] as Map<string, CommentRef>;
}

async function postComment(
  server: FastifyInstance,
  actor: TestUser | undefined,
  modelId: string,
  body: Record<string, unknown>,
) {
  return server.inject({
    method: 'POST',
    url: `/api/v1/models/${modelId}/comments`,
    payload: body,
    headers: {
      'content-type': 'application/json',
      ...(actor ? { cookie: actor.cookie } : {}),
    },
  });
}

async function seedComment(
  this: ICustomWorld,
  actorName: string,
  content: string,
  modelId: string,
  label: string,
  parentId?: string,
): Promise<void> {
  const actor = getUsers(this.context).get(actorName)!;
  const res = await postComment(this.server, actor, modelId, {
    content,
    ...(parentId ? { parentId } : {}),
  });
  if (res.statusCode !== 201) {
    throw new Error(`Failed to seed comment (${res.statusCode}): ${res.body}`);
  }
  const id = JSON.parse(res.body).id;
  getComments(this.context).set(label, { id, modelId });
}

// Recursively locates a comment node by id in either a `Paginated<Comment>`
// envelope (`{ data: [...] }`) or a single re-rooted `Comment`, descending
// into each node's embedded `replies` (itself a `{ data: [...] }` envelope).
function findCommentNode(body: unknown, id: string): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const container = body as { data?: unknown[]; id?: unknown; replies?: unknown };
  const candidates = Array.isArray(container.data) ? container.data : [container];

  for (const candidate of candidates) {
    const node = candidate as Record<string, unknown>;
    if (node?.['id'] === id) return node;
    if (node?.['replies']) {
      const found = findCommentNode(node['replies'], id);
      if (found) return found;
    }
  }
  return undefined;
}

function commentId(this: ICustomWorld, label: string): string {
  return getComments(this.context).get(label)!.id;
}

When(
  '{string} comments {string} on {string}',
  async function (this: ICustomWorld, actorName: string, content: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await postComment(this.server, actor, modelId, { content });
  },
);

When(
  'an anonymous viewer comments {string} on {string}',
  async function (this: ICustomWorld, content: string, modelTitle: string) {
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await postComment(this.server, undefined, modelId, { content });
  },
);

Given(
  '{string} has commented {string} on {string} as {string}',
  async function (this: ICustomWorld, actorName: string, content: string, modelTitle: string, label: string) {
    const modelId = getModels(this.context).get(modelTitle)!;
    await seedComment.call(this, actorName, content, modelId, label);
  },
);

Given(
  '{string} has commented {int} times on {string} as {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    count: number,
    modelTitle: string,
    label: string,
  ) {
    const modelId = getModels(this.context).get(modelTitle)!;
    for (let i = 1; i <= count; i++) {
      const rootLabel = `${label}-${i}`;
      await seedComment.call(this, actorName, rootLabel, modelId, rootLabel);
    }
  },
);

When(
  '{string} replies {string} to comment {string} on {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    content: string,
    parentLabel: string,
    modelTitle: string,
  ) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const parent = getComments(this.context).get(parentLabel)!;
    this.context.latestResponse = await postComment(this.server, actor, modelId, {
      content,
      parentId: parent.id,
    });
  },
);

Given(
  '{string} has replied {string} to comment {string} as {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    content: string,
    parentLabel: string,
    label: string,
  ) {
    const parent = getComments(this.context).get(parentLabel)!;
    await seedComment.call(this, actorName, content, parent.modelId, label, parent.id);
  },
);

When(
  '{string} lists comments on {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/comments`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} lists comments on {string} with limit {int}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string, limit: number) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/comments?limit=${limit}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  'an anonymous viewer lists comments on {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/comments`,
    });
  },
);

Given(
  '{string} has replied {int} times to comment {string} as {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    count: number,
    parentLabel: string,
    label: string,
  ) {
    const parent = getComments(this.context).get(parentLabel)!;
    for (let i = 1; i <= count; i++) {
      const childLabel = `${label}-${i}`;
      await seedComment.call(this, actorName, childLabel, parent.modelId, childLabel, parent.id);
    }
  },
);

When(
  '{string} gets comment {string} on {string}',
  async function (this: ICustomWorld, actorName: string, label: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const id = commentId.call(this, label);
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/comments/${id}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} gets comment {string} on {string} with page {int} and limit {int}',
  async function (
    this: ICustomWorld,
    actorName: string,
    label: string,
    modelTitle: string,
    page: number,
    limit: number,
  ) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const id = commentId.call(this, label);
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/comments/${id}?page=${page}&limit=${limit}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} edits comment {string} on {string} with content {string}',
  async function (
    this: ICustomWorld,
    actorName: string,
    label: string,
    modelTitle: string,
    content: string,
  ) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const id = commentId.call(this, label);
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/models/${modelId}/comments/${id}`,
      payload: { content },
      headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    });
  },
);

When(
  '{string} deletes comment {string} on {string}',
  async function (this: ICustomWorld, actorName: string, label: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const id = commentId.call(this, label);
    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/comments/${id}`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} likes comment {string} on {string}',
  async function (this: ICustomWorld, actorName: string, label: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const id = commentId.call(this, label);
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/comments/${id}/like`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} unlikes comment {string} on {string}',
  async function (this: ICustomWorld, actorName: string, label: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    const id = commentId.call(this, label);
    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/comments/${id}/like`,
      headers: { cookie: actor.cookie },
    });
  },
);

Then(
  'comment {string} should appear in the response',
  function (this: ICustomWorld, label: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const node = findCommentNode(body, commentId.call(this, label));
    assert.ok(node, `Expected comment "${label}" to appear in the response`);
  },
);

Then(
  'comment {string} should not appear in the response',
  function (this: ICustomWorld, label: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const node = findCommentNode(body, commentId.call(this, label));
    assert.ok(!node, `Expected comment "${label}" to NOT appear in the response`);
  },
);

Then(
  'comment {string} in the response should have property {string} equal to {string}',
  function (this: ICustomWorld, label: string, property: string, expected: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const node = findCommentNode(body, commentId.call(this, label));
    assert.ok(node, `Expected comment "${label}" to appear in the response`);
    assert.strictEqual(String(node![property]), expected);
  },
);

Then(
  'comment {string} should have replies count {int}',
  function (this: ICustomWorld, label: string, expected: number) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const node = findCommentNode(body, commentId.call(this, label));
    assert.ok(node, `Expected comment "${label}" to appear in the response`);
    const replies = node!['replies'] as { count?: number } | undefined;
    assert.strictEqual(replies?.count, expected);
  },
);

Then(
  'comment {string} should have {int} embedded replies',
  function (this: ICustomWorld, label: string, expected: number) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const node = findCommentNode(body, commentId.call(this, label));
    assert.ok(node, `Expected comment "${label}" to appear in the response`);
    const replies = node!['replies'] as { data?: unknown[] } | undefined;
    assert.strictEqual(replies?.data?.length, expected);
  },
);

Then(
  /^comment "([^"]+)" embedded replies should be exactly (.+)$/,
  function (this: ICustomWorld, label: string, rawLabels: string) {
    const expectedLabels = rawLabels.split(',').map((part) => part.trim().replace(/^"|"$/g, ''));
    const body = JSON.parse(this.context.latestResponse!.body);
    const node = findCommentNode(body, commentId.call(this, label));
    assert.ok(node, `Expected comment "${label}" to appear in the response`);
    const replies = node!['replies'] as { data?: { id: string }[] } | undefined;
    const actualIds = (replies?.data ?? []).map((reply) => reply.id);
    const expectedIds = expectedLabels.map((expectedLabel) => commentId.call(this, expectedLabel));
    assert.deepStrictEqual(actualIds, expectedIds);
  },
);

Then(
  'comment {string} should not report likedByMe',
  function (this: ICustomWorld, label: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const node = findCommentNode(body, commentId.call(this, label));
    assert.ok(node, `Expected comment "${label}" to appear in the response`);
    assert.ok(!('likedByMe' in node!), `Expected comment "${label}" to not report likedByMe`);
  },
);

// --- Mail capture -----------------------------------------------------------
// The comment service fires `notifyOnNewComment` fire-and-forget (`void`) after
// the write transaction commits, so the HTTP response can return before mail
// dispatch runs. Rather than sending through a real SMTP/Mailpit round trip,
// `mailService.sendMailAsync` (a DI singleton) is monkey-patched with a capturing
// stub, and mail assertions poll briefly for the expected number of calls.

function installMailSpy(server: FastifyInstance): MailCall[] {
  const calls: MailCall[] = [];
  const mailService = server.diContainer.cradle.mailService as {
    sendMailAsync: (content: unknown) => Promise<void>;
  };
  mailService.sendMailAsync = (content: unknown) => {
    const { to } = content as { to?: string };
    calls.push({ to: to ?? '' });
    return Promise.resolve();
  };
  return calls;
}

async function waitForMailCalls(calls: MailCall[], expected: number, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (calls.length < expected && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

Given('mail delivery is captured', function (this: ICustomWorld) {
  this.context['mailCalls'] = installMailSpy(this.server);
});

Then(
  'mail should have been sent to {int} recipients',
  async function (this: ICustomWorld, count: number) {
    const calls = this.context['mailCalls'] as MailCall[];
    await waitForMailCalls(calls, count);
    assert.strictEqual(calls.length, count);
  },
);

Then(
  'mail should have been sent to {string}',
  function (this: ICustomWorld, actorName: string) {
    const calls = this.context['mailCalls'] as MailCall[];
    const actor = getUsers(this.context).get(actorName)!;
    assert.ok(
      calls.some((call) => call.to === actor.email),
      `Expected an email to be sent to ${actor.email}`,
    );
  },
);

Then(
  'mail should not have been sent to {string}',
  function (this: ICustomWorld, actorName: string) {
    const calls = this.context['mailCalls'] as MailCall[];
    const actor = getUsers(this.context).get(actorName)!;
    assert.ok(
      !calls.some((call) => call.to === actor.email),
      `Expected no email to be sent to ${actor.email}`,
    );
  },
);

Then('no mail should have been sent', async function (this: ICustomWorld) {
  // Give the fire-and-forget notifier a brief window before asserting absence.
  await new Promise((resolve) => setTimeout(resolve, 200));
  const calls = this.context['mailCalls'] as MailCall[];
  assert.strictEqual(calls.length, 0);
});

// --- Comment repository call counter -----------------------------------------
// Pins the level-batched traversal: shape assertions alone can't distinguish a
// per-node fan-out from a per-level batch, since both produce the same response
// body. `modelCommentRepository` (a DI singleton, same pattern as the mail spy
// above) is monkey-patched with counting wrappers around its batched read
// methods; the After hook below restores the originals so the spy can't leak
// into scenarios that never asked for it.

type CountedRepoMethod = 'listRepliesByParents' | 'countRepliesByParent';

interface RepoCall {
  parentIdsLength: number;
}

interface RepoCounterSpy {
  calls: Record<CountedRepoMethod, RepoCall[]>;
  restore: () => void;
}

const COUNTED_REPO_METHODS: Array<CountedRepoMethod> = [
  'listRepliesByParents',
  'countRepliesByParent',
];

function installCommentRepoCounter(server: FastifyInstance): RepoCounterSpy {
  const repo = server.diContainer.cradle.modelCommentRepository as Record<
    CountedRepoMethod,
    (...args: Array<unknown>) => unknown
  >;
  const calls: Record<CountedRepoMethod, RepoCall[]> = {
    listRepliesByParents: [],
    countRepliesByParent: [],
  };
  const originals = new Map<CountedRepoMethod, (...args: Array<unknown>) => unknown>();

  for (const method of COUNTED_REPO_METHODS) {
    const original = repo[method].bind(repo);
    originals.set(method, original);
    repo[method] = (...args: Array<unknown>) => {
      const parentIds = args[0] as Array<string>;
      calls[method].push({ parentIdsLength: parentIds.length });
      return original(...args);
    };
  }

  return {
    calls,
    restore: () => {
      for (const [method, original] of originals) {
        repo[method] = original;
      }
    },
  };
}

function getRepoCounterSpy(context: Record<string, unknown>): RepoCounterSpy {
  return context['commentRepoSpy'] as RepoCounterSpy;
}

Given('comment repository calls are counted', function (this: ICustomWorld) {
  this.context['commentRepoSpy'] = installCommentRepoCounter(this.server);
});

Given('comment repository call counts are reset', function (this: ICustomWorld) {
  const spy = getRepoCounterSpy(this.context);
  for (const method of COUNTED_REPO_METHODS) {
    spy.calls[method].length = 0;
  }
});

Then(
  '{string} should have been called {int} times',
  function (this: ICustomWorld, method: string, expected: number) {
    const spy = getRepoCounterSpy(this.context);
    const calls = spy.calls[method as CountedRepoMethod];
    assert.ok(calls, `Unknown counted repository method "${method}"`);
    assert.strictEqual(
      calls.length,
      expected,
      `Expected "${method}" to have been called ${expected} times, got ${calls.length}`,
    );
  },
);

Then(
  '{string} call {int} should have received {int} parent ids',
  function (this: ICustomWorld, method: string, callNumber: number, expected: number) {
    const spy = getRepoCounterSpy(this.context);
    const calls = spy.calls[method as CountedRepoMethod];
    assert.ok(calls, `Unknown counted repository method "${method}"`);
    const call = calls[callNumber - 1];
    assert.ok(call, `Expected "${method}" call ${callNumber} to have been made`);
    assert.strictEqual(call.parentIdsLength, expected);
  },
);

After(function (this: ICustomWorld) {
  const spy = this.context['commentRepoSpy'] as RepoCounterSpy | undefined;
  spy?.restore();
});
