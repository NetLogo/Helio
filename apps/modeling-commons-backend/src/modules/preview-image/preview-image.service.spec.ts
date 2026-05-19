import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import makePreviewImageService from '#src/modules/preview-image/preview-image.service.ts';
import {
  ModelPreviewServiceError,
  ModelPreviewTimeoutError,
  ModelPreviewTooLargeError,
} from '#src/modules/preview-image/domain/preview-image.errors.ts';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function makeFileService() {
  return {
    getUrl: vi.fn(async () => 'https://signed.example.com/model.nlogo'),
  };
}

function makeResponse(opts: {
  status?: number;
  contentLength?: number | null;
  body?: ArrayBuffer;
  contentType?: string;
}): Response {
  const status = opts.status ?? 200;
  const headers = new Headers();
  if (opts.contentLength !== null && opts.contentLength !== undefined) {
    headers.set('Content-Length', String(opts.contentLength));
  }
  headers.set('Content-Type', opts.contentType ?? 'image/png');
  const ok = status >= 200 && status < 300;
  const body = opts.body ?? new ArrayBuffer(0);
  return {
    ok,
    status,
    headers,
    body: { cancel: vi.fn(async () => undefined) } as unknown as ReadableStream<Uint8Array>,
    arrayBuffer: vi.fn(async () => body),
  } as unknown as Response;
}

describe('previewImageService (security regressions)', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('aborts the render fetch and throws ModelPreviewTimeoutError when the upstream hangs (H-9)', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        }),
    );
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const service = makePreviewImageService({ fileService: makeFileService() } as never);

    const pending = service.generatePreviewFromNetlogoFile('models/abc.nlogox');
    pending.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(31_000);

    await expect(pending).rejects.toBeInstanceOf(ModelPreviewTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses responses whose Content-Length exceeds MAX_IMAGE_SIZE (H-10 header check)', async () => {
    const response = makeResponse({
      status: 200,
      contentLength: MAX_IMAGE_SIZE + 1,
      body: new ArrayBuffer(1),
    });
    globalThis.fetch = vi.fn(async () => response) as typeof globalThis.fetch;

    const service = makePreviewImageService({ fileService: makeFileService() } as never);

    await expect(service.generatePreviewFromNetlogoFile('models/big.nlogox')).rejects.toBeInstanceOf(
      ModelPreviewTooLargeError,
    );
    expect(response.body!.cancel).toHaveBeenCalled();
  });

  it('refuses bodies that exceed MAX_IMAGE_SIZE even when Content-Length is missing or lies (H-10 buffer check)', async () => {
    const body = new ArrayBuffer(MAX_IMAGE_SIZE + 10);
    const response = makeResponse({
      status: 200,
      contentLength: null,
      body,
    });
    globalThis.fetch = vi.fn(async () => response) as typeof globalThis.fetch;

    const service = makePreviewImageService({ fileService: makeFileService() } as never);

    await expect(
      service.generatePreviewFromNetlogoFile('models/sneaky.nlogox'),
    ).rejects.toBeInstanceOf(ModelPreviewTooLargeError);
  });

  it('wraps generic fetch failures in ModelPreviewServiceError (H-9 negative path)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof globalThis.fetch;

    const service = makePreviewImageService({ fileService: makeFileService() } as never);

    const err = await service
      .generatePreviewFromNetlogoFile('models/down.nlogox')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModelPreviewServiceError);
    expect(err).not.toBeInstanceOf(ModelPreviewTimeoutError);
  });
});
