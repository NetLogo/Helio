import { FileUploadError, FileValidationError } from '#src/modules/file/domain/file.errors.ts';
import { ArgumentInvalidException } from '#src/shared/exceptions/index.ts';
import { resolveFile, type ResolvedFile } from '#src/shared/hooks/resolve-file.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Type } from 'typebox';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fileTypeMock = vi.hoisted(() => ({ fileTypeFromBuffer: vi.fn() }));
vi.mock('file-type', () => fileTypeMock);

const reply = {} as FastifyReply;

function makeRequest(opts: {
  file?: {
    filename: string;
    mimetype: string;
    encoding: string;
    buffer: Buffer;
    truncated?: boolean;
    fields?: Record<string, unknown>;
  } | null;
}): FastifyRequest {
  if (opts.file === null) {
    return { file: async () => undefined } as unknown as FastifyRequest;
  }
  const f = opts.file!;
  return {
    file: async () => ({
      filename: f.filename,
      mimetype: f.mimetype,
      encoding: f.encoding,
      fields: f.fields ?? {},
      file: { truncated: f.truncated ?? false },
      toBuffer: async () => f.buffer,
    }),
  } as unknown as FastifyRequest;
}

describe('resolveFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileTypeMock.fileTypeFromBuffer.mockReset();
  });

  it('throws FileUploadError when no file is provided', async () => {
    const hook = resolveFile();
    // @ts-expect-error - no need for done callback
    await expect(hook(makeRequest({ file: null }), reply)).rejects.toThrow(FileUploadError);
  });

  it('throws FileUploadError when the upload was truncated', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    const hook = resolveFile();
    const request = makeRequest({
      file: {
        filename: 'big.png',
        mimetype: 'image/png',
        encoding: '7bit',
        buffer: Buffer.from('x'),
        truncated: true,
      },
    });
    // @ts-expect-error - no need for done callback
    await expect(hook(request, reply)).rejects.toThrow(FileUploadError);
  });

  it('rejects when the detected mime does not match the declared mime', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue({
      mime: 'application/x-msdownload',
      ext: 'exe',
    });
    const hook = resolveFile();
    const request = makeRequest({
      file: {
        filename: 'image.png',
        mimetype: 'image/png',
        encoding: '7bit',
        buffer: Buffer.from('xx'),
      },
    });
    // @ts-expect-error - no need for done callback
    await expect(hook(request, reply)).rejects.toThrow(FileValidationError);
  });

  it('rejects when the detected type is in the denied list', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue({
      mime: 'application/x-msdownload',
      ext: 'exe',
    });
    const hook = resolveFile();
    const request = makeRequest({
      file: {
        filename: 'a.exe',
        mimetype: 'application/x-msdownload',
        encoding: '7bit',
        buffer: Buffer.from('xx'),
      },
    });
    // @ts-expect-error - no need for done callback
    await expect(hook(request, reply)).rejects.toThrow(FileValidationError);
  });

  it('rejects when the detected mime is outside the explicit allowlist', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    const hook = resolveFile({ allowedMimeTypes: ['image/jpeg'] });
    const request = makeRequest({
      file: {
        filename: 'a.png',
        mimetype: 'image/png',
        encoding: '7bit',
        buffer: Buffer.from('xx'),
      },
    });
    // @ts-expect-error - no need for done callback
    await expect(hook(request, reply)).rejects.toThrow(FileValidationError);
  });

  it('rejects when requireDetectedType=true and detection fails', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue(undefined);
    const hook = resolveFile({ requireDetectedType: true });
    const request = makeRequest({
      file: {
        filename: 'unknown.bin',
        mimetype: 'application/octet-stream',
        encoding: '7bit',
        buffer: Buffer.from('xx'),
      },
    });
    // @ts-expect-error - no need for done callback
    await expect(hook(request, reply)).rejects.toThrow(FileValidationError);
  });

  it('accepts and attaches uploadedFile when validation passes', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    const hook = resolveFile({ allowedMimeTypes: ['image/png'] });
    const request = makeRequest({
      file: {
        filename: 'a.png',
        mimetype: 'image/png',
        encoding: '7bit',
        buffer: Buffer.from([1, 2, 3]),
      },
    });

    // @ts-expect-error - no need for done callback
    await hook(request, reply);

    const uploaded = (request as unknown as { uploadedFile: ResolvedFile }).uploadedFile;
    expect(uploaded.filename).toBe('a.png');
    expect(uploaded.detectedMimetype).toBe('image/png');
    expect(uploaded.mimetype).toBe('image/png');
    expect(uploaded.buffer.length).toBe(3);
  });

  it('falls back to undetectedTypesDefault when no type was detected and not required', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue(undefined);
    const hook = resolveFile();
    const request = makeRequest({
      file: {
        filename: 'unknown.bin',
        mimetype: 'application/octet-stream',
        encoding: '7bit',
        buffer: Buffer.from('xx'),
      },
    });

    // @ts-expect-error - no need for done callback
    await hook(request, reply);

    const uploaded = (request as unknown as { uploadedFile: ResolvedFile }).uploadedFile;
    expect(uploaded.mimetype).toBe('application/octet-stream');
    expect(uploaded.detectedMimetype).toBeNull();
  });

  it('parses and validates text fields against a Typebox schema', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    const schema = Type.Object({
      role: Type.Union([Type.Literal('primary'), Type.Literal('attachment')]),
    });
    const hook = resolveFile({ fieldsSchema: schema });
    const request = makeRequest({
      file: {
        filename: 'a.png',
        mimetype: 'image/png',
        encoding: '7bit',
        buffer: Buffer.from('xx'),
        fields: { role: { value: 'primary' } },
      },
    });

    // @ts-expect-error - no need for done callback
    await hook(request, reply);

    const uploaded = (request as unknown as { uploadedFile: ResolvedFile }).uploadedFile;
    expect(uploaded.values).toEqual({ role: 'primary' });
  });

  it('rejects when text fields fail the supplied schema', async () => {
    fileTypeMock.fileTypeFromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    const schema = Type.Object({ role: Type.Literal('primary') });
    const hook = resolveFile({ fieldsSchema: schema });
    const request = makeRequest({
      file: {
        filename: 'a.png',
        mimetype: 'image/png',
        encoding: '7bit',
        buffer: Buffer.from('xx'),
        fields: { role: { value: 'wrong' } },
      },
    });

    // @ts-expect-error - no need for done callback
    await expect(hook(request, reply)).rejects.toThrow(ArgumentInvalidException);
  });
});
