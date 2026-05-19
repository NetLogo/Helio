import assert from 'node:assert';
import { Then, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import { type TestUser } from '../support/auth-helper.ts';

const PNG_1x1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d49444154789c63f8cf000001010100182d0bb40000000049454e44ae426082',
  'hex',
);

function buildSingleFileMultipart(opts: {
  filename: string;
  contentType: string;
  payload: Buffer;
}): { payload: Buffer; contentType: string } {
  const boundary = `----FileBoundary${Date.now().toString(16)}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${opts.filename}"\r\n` +
      `Content-Type: ${opts.contentType}\r\n\r\n`,
    'utf-8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  return {
    payload: Buffer.concat([head, opts.payload, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function uploadAvatar(
  server: import('fastify').FastifyInstance,
  cookie: string | undefined,
  filename: string,
  contentType: string,
  body: Buffer,
) {
  const { payload, contentType: ct } = buildSingleFileMultipart({
    filename,
    contentType,
    payload: body,
  });
  return server.inject({
    method: 'POST',
    url: '/api/v1/uploads/avatar',
    payload,
    headers: {
      'content-type': ct,
      ...(cookie ? { cookie } : {}),
    },
  });
}

When('an anonymous viewer uploads a PNG avatar', async function (this: ICustomWorld) {
  this.context.latestResponse = await uploadAvatar(
    this.server,
    undefined,
    'avatar.png',
    'image/png',
    PNG_1x1,
  );
});

When('I upload a PNG avatar', async function (this: ICustomWorld) {
  const user = this.context['currentUser'] as TestUser;
  this.context.latestResponse = await uploadAvatar(
    this.server,
    user.cookie,
    'avatar.png',
    'image/png',
    PNG_1x1,
  );
});

When(
  'I upload an avatar with mime {string}',
  async function (this: ICustomWorld, mime: string) {
    const user = this.context['currentUser'] as TestUser;
    this.context.latestResponse = await uploadAvatar(
      this.server,
      user.cookie,
      'doc.pdf',
      mime,
      Buffer.from('%PDF-1.4\n%fake'),
    );
  },
);

Then(
  'the response body should have length {int}',
  function (this: ICustomWorld, length: number) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.ok(Array.isArray(body), 'expected an array response');
    assert.strictEqual(body.length, length);
  },
);
