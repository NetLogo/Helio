import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('#src/shared/storage/index.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#src/shared/storage/index.ts')>();
  return { ...actual, getSignedUrl: vi.fn(async () => 'https://signed.example.com/signed-url') };
});

import makeFileService from '#src/modules/file/file.service.ts';
import fileDomain from '#src/modules/file/domain/file.domain.ts';
import { FileNotFoundError } from '#src/modules/file/domain/file.errors.ts';
import { PUBLIC_PREFIX } from '#src/modules/file/domain/file.types.ts';

describe('fileService', () => {
  const storage = { send: vi.fn() };
  const bucket = { Name: 'test-bucket' };
  const domain = fileDomain();

  const service = makeFileService({
    fileDomain: domain,
    storage,
    bucket,
    storagePublicBaseUrl: 'https://cdn.example.com/test-bucket',
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upload', () => {
    it('stores private files without public prefix', async () => {
      storage.send.mockResolvedValue({});

      const key = await service.upload({
        filename: 'm.nlogox',
        buffer: Buffer.from('data') as Buffer<ArrayBuffer>,
        contentType: 'application/octet-stream',
      });

      expect(key.startsWith(`${PUBLIC_PREFIX}/`)).toBe(false);
      const cmd = storage.send.mock.calls[0]![0];
      expect(cmd.input.ACL).toBe('private');
      expect(cmd.input.Key).toBe(key);
    });

    it('prefixes public-read files with the public prefix', async () => {
      storage.send.mockResolvedValue({});

      const key = await service.upload({
        filename: 'logo.png',
        buffer: Buffer.from('img') as Buffer<ArrayBuffer>,
        contentType: 'image/png',
        access: 'public-read',
      });

      expect(key.startsWith(`${PUBLIC_PREFIX}/`)).toBe(true);
      const cmd = storage.send.mock.calls[0]![0];
      expect(cmd.input.ACL).toBe('public-read');
    });

    it('combines public prefix with pathPrefix', async () => {
      storage.send.mockResolvedValue({});

      const key = await service.upload({
        filename: 'a.png',
        buffer: Buffer.from('x') as Buffer<ArrayBuffer>,
        contentType: 'image/png',
        access: 'public-read',
        pathPrefix: 'avatars',
      });

      expect(key.startsWith(`${PUBLIC_PREFIX}/avatars/`)).toBe(true);
    });
  });

  describe('getMetadata', () => {
    it('returns metadata for existing file', async () => {
      storage.send.mockResolvedValue({
        ContentType: 'image/png',
        ContentLength: 42,
        Metadata: { filename: 'a.png', createdat: new Date().toISOString() },
      });

      const info = await service.getMetadata('files/public/2026/04/17/a-b.png');

      expect(info.contentType).toBe('image/png');
      expect(info.sizeBytes).toBe(BigInt(42));
      expect(info.access).toBe('public-read');
    });

    it('throws FileNotFoundError when metadata marks deleted', async () => {
      storage.send.mockResolvedValue({
        Metadata: {
          filename: 'a.png',
          createdat: new Date().toISOString(),
          deletedat: new Date().toISOString(),
        },
      });

      await expect(service.getMetadata('2026/04/17/a-b.png')).rejects.toThrow(FileNotFoundError);
    });
  });

  describe('getUrl', () => {
    it('returns public CDN URL for public keys', async () => {
      const url = await service.getUrl(`${PUBLIC_PREFIX}/2026/04/17/abcd-pic.png`);
      expect(url).toBe(
        `https://cdn.example.com/test-bucket/${PUBLIC_PREFIX}/2026/04/17/abcd-pic.png`,
      );
      expect(storage.send).not.toHaveBeenCalled();
    });

    it('returns presigned URL for private keys', async () => {
      const url = await service.getUrl('2026/04/17/abcd-priv.nlogox');
      expect(url).toBe('https://signed.example.com/signed-url');
    });
  });
});
