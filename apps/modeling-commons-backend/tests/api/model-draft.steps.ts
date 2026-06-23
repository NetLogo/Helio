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

function buildNamedPrimaryFileMultipart(
  filename: string,
  content: string,
): { payload: Buffer; contentType: string } {
  const boundary = `----DraftBoundary${Date.now().toString(16)}`;
  const parts = [
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
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

function buildDeniedPrimaryFileMultipart(): { payload: Buffer; contentType: string } {
  const boundary = `----DraftBoundary${Date.now().toString(16)}`;
  const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  const body = Buffer.concat([peHeader, Buffer.alloc(256, 0)]);
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="evil.exe"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
    'utf-8',
  );
  const between = Buffer.from(
    `\r\n--${boundary}\r\n` + `Content-Disposition: form-data; name="role"\r\n\r\n` + `primary\r\n`,
    'utf-8',
  );
  const tail = Buffer.from(`--${boundary}--\r\n`, 'utf-8');
  return {
    payload: Buffer.concat([head, body, between, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function buildOversizedPrimaryFileMultipart(): { payload: Buffer; contentType: string } {
  const boundary = `----DraftBoundary${Date.now().toString(16)}`;
  const oversizeBytes = 15 * 1024 * 1024 + 1024;
  const body = Buffer.alloc(oversizeBytes, 0x61);
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="huge.nlogo"\r\n` +
      `Content-Type: text/plain\r\n\r\n`,
    'utf-8',
  );
  const between = Buffer.from(
    `\r\n--${boundary}\r\n` + `Content-Disposition: form-data; name="role"\r\n\r\n` + `primary\r\n`,
    'utf-8',
  );
  const tail = Buffer.from(`--${boundary}--\r\n`, 'utf-8');
  return {
    payload: Buffer.concat([head, body, between, tail]),
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

When(
  'I upload a primary file named {string} to the draft',
  async function (this: ICustomWorld, filename: string) {
    const user = this.context['currentUser'] as TestUser;
    const draftId = this.context['currentDraftId'] as string;
    const { payload, contentType } = buildNamedPrimaryFileMultipart(
      filename,
      `; Test Model\nto setup\nclear-all\nend\n`,
    );
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/model-drafts/${draftId}/files`,
      payload,
      headers: { cookie: user.cookie, 'content-type': contentType },
    });
  },
);

When('I upload a denied primary file to the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  const { payload, contentType } = buildDeniedPrimaryFileMultipart();
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: `/api/v1/model-drafts/${draftId}/files`,
    payload,
    headers: { cookie: user.cookie, 'content-type': contentType },
  });
});

When('I upload an oversized primary file to the draft', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const draftId = this.context['currentDraftId'] as string;
  const { payload, contentType } = buildOversizedPrimaryFileMultipart();
  this.context.latestResponse = await this.server.inject({
    method: 'POST',
    url: `/api/v1/model-drafts/${draftId}/files`,
    payload,
    headers: { cookie: user.cookie, 'content-type': contentType },
  });
});

When(
  'I patch the draft with title {string} visibility {string} and tags {string}',
  async function (this: ICustomWorld, title: string, visibility: string, tags: string) {
    const user = this.context['currentUser'] as TestUser;
    const draftId = this.context['currentDraftId'] as string;
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/model-drafts/${draftId}`,
      payload: { title, visibility, tags: tagList },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When('I fetch the card for the published model', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  const modelId = JSON.parse(this.context.latestResponse!.body).modelId;
  this.context['publishedModelId'] = modelId;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: `/api/v1/models/${modelId}/card`,
    headers: { cookie: user.cookie },
  });
});

Then(
  'the card latest version tags should include {string}',
  function (this: ICustomWorld, tagName: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const tags = (body.tagsOnLatestVersion ?? []) as Array<{ name: string }>;
    assert.ok(
      tags.some((t) => t.name === tagName),
      `Expected tag "${tagName}" in [${tags.map((t) => t.name).join(', ')}]`,
    );
  },
);

Then(
  'the card preview image url should be public and unsigned',
  function (this: ICustomWorld) {
    const body = JSON.parse(this.context.latestResponse!.body);
    const url = body.previewImageUrl as string | null;
    assert.ok(typeof url === 'string' && url.length > 0, 'Expected a previewImageUrl');
    assert.ok(url!.includes('files/public/'), `Expected public URL, got "${url}"`);
    assert.ok(!url!.includes('X-Amz-Signature'), `Expected unsigned URL, got "${url}"`);
  },
);

Then(
  'no drafts targeting the model {string} remain for the current user',
  async function (this: ICustomWorld, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const res = await this.server.inject({
      method: 'GET',
      url: '/api/v1/model-drafts',
      headers: { cookie: user.cookie },
    });
    assert.strictEqual(res.statusCode, 200, `Failed to list drafts (${res.statusCode}): ${res.body}`);
    const body = JSON.parse(res.body);
    const drafts = (body.data ?? []) as Array<{ modelId: string | null }>;
    const remaining = drafts.filter((d) => d.modelId === modelId);
    assert.strictEqual(
      remaining.length,
      0,
      `Expected no drafts targeting model ${modelId}, found ${remaining.length}`,
    );
  },
);

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

Given(
  'the current user has uploaded an additional file to {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    const boundary = `----AddFileBoundary${Date.now().toString(16)}`;
    const head = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="data.csv"\r\n` +
        `Content-Type: text/csv\r\n\r\n`,
      'utf-8',
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const payload = Buffer.concat([head, Buffer.from('col1,col2\n1,2\n', 'utf-8'), tail]);
    const res = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/additional-files`,
      payload,
      headers: { cookie: user.cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
    });
    if (res.statusCode !== 201) {
      throw new Error(`Failed to upload additional file (${res.statusCode}): ${res.body}`);
    }
  },
);

type AdditionalFileRow = { kind: 'model' | 'additional'; taggedVersionNumber: number };

When(
  'I list the additional files for model {string} version {int}',
  async function (this: ICustomWorld, modelTitle: string, version: number) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/additional-files?taggedVersionNumber=${version}`,
      headers: { cookie: user.cookie },
    });
  },
);

When(
  'I list all additional files for model {string}',
  async function (this: ICustomWorld, modelTitle: string) {
    const user = this.context['currentUser'] as TestUser;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/additional-files`,
      headers: { cookie: user.cookie },
    });
  },
);

Then(
  'the additional files response should contain {int} files of kind {string}',
  function (this: ICustomWorld, expected: number, kind: string) {
    const rows = JSON.parse(this.context.latestResponse!.body) as Array<AdditionalFileRow>;
    const matching = rows.filter((r) => r.kind === kind);
    assert.strictEqual(
      matching.length,
      expected,
      `Expected ${expected} files of kind "${kind}", got ${matching.length}`,
    );
  },
);

Then(
  'the additional files response should contain {int} files of kind {string} tagged at version {int}',
  function (this: ICustomWorld, expected: number, kind: string, version: number) {
    const rows = JSON.parse(this.context.latestResponse!.body) as Array<AdditionalFileRow>;
    const matching = rows.filter((r) => r.kind === kind && r.taggedVersionNumber === version);
    assert.strictEqual(
      matching.length,
      expected,
      `Expected ${expected} files of kind "${kind}" tagged at version ${version}, ` +
        `got ${matching.length} (rows: ${JSON.stringify(rows.map((r) => ({ kind: r.kind, v: r.taggedVersionNumber })))})`,
    );
  },
);

Then(
  'each tag in the response should have a non-empty displayName',
  function (this: ICustomWorld) {
    const rows = JSON.parse(this.context.latestResponse!.body) as Array<{ displayName?: string }>;
    assert.ok(rows.length > 0, 'Expected at least one tag in the response');
    for (const row of rows) {
      assert.ok(
        typeof row.displayName === 'string' && row.displayName.length > 0,
        `Expected a non-empty displayName, got ${JSON.stringify(row)}`,
      );
    }
  },
);
