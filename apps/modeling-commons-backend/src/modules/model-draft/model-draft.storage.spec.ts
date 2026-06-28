import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelDraftStorage from '#src/modules/model-draft/model-draft.storage.ts';
import { PUBLIC_PREFIX } from '#src/modules/file/domain/file.types.ts';

describe('modelDraftStorage', () => {
  const storage = { send: vi.fn() };
  const bucket = { Name: 'test-bucket' };
  const fileDomain = { createFile: vi.fn() };

  const draftStorage = makeModelDraftStorage({ storage, bucket, fileDomain } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('putStaged', () => {
    it('stages private files under the staging prefix without an ACL', async () => {
      storage.send.mockResolvedValue({});

      const key = await draftStorage.putStaged({
        userId: 'u1',
        draftId: 'd1',
        buffer: Buffer.from('model') as Buffer<ArrayBuffer>,
        filename: 'model.nlogox',
        contentType: 'text/plain',
      });

      expect(key.startsWith('staging/u1/d1/')).toBe(true);
      expect(key.startsWith(`${PUBLIC_PREFIX}/`)).toBe(false);
      const cmd = storage.send.mock.calls[0]![0];
      expect(cmd.input.Key).toBe(key);
      expect(cmd.input.ACL).toBeUndefined();
    });

    it('stages public files under the public prefix with a public-read ACL', async () => {
      storage.send.mockResolvedValue({});

      const key = await draftStorage.putStaged({
        userId: 'u1',
        draftId: 'd1',
        buffer: Buffer.from('img') as Buffer<ArrayBuffer>,
        filename: 'preview.png',
        contentType: 'image/png',
        public: true,
      });

      expect(key.startsWith(`${PUBLIC_PREFIX}/staging/u1/d1/`)).toBe(true);
      const cmd = storage.send.mock.calls[0]![0];
      expect(cmd.input.Key).toBe(key);
      expect(cmd.input.ACL).toBe('public-read');
    });
  });

  describe('deleteStagingPrefix', () => {
    it('sweeps both the private and public staging prefixes', async () => {
      storage.send.mockImplementation(async (cmd: { constructor: { name: string }; input: { Prefix?: string } }) => {
        if (cmd.constructor.name === 'ListObjectsV2Command') {
          return { Contents: [{ Key: `${cmd.input.Prefix}leftover.bin` }], IsTruncated: false };
        }
        return {};
      });

      await draftStorage.deleteStagingPrefix('u1', 'd1');

      const sent = storage.send.mock.calls.map((c) => c[0]);
      const listedPrefixes = sent
        .filter((cmd) => cmd.constructor.name === 'ListObjectsV2Command')
        .map((cmd) => cmd.input.Prefix);
      expect(listedPrefixes).toContain('staging/u1/d1/');
      expect(listedPrefixes).toContain(`${PUBLIC_PREFIX}/staging/u1/d1/`);

      const deletedKeys = sent
        .filter((cmd) => cmd.constructor.name === 'DeleteObjectsCommand')
        .flatMap((cmd) => cmd.input.Delete.Objects.map((o: { Key: string }) => o.Key));
      expect(deletedKeys).toContain('staging/u1/d1/leftover.bin');
      expect(deletedKeys).toContain(`${PUBLIC_PREFIX}/staging/u1/d1/leftover.bin`);
    });

    it('skips deletion when a prefix is empty', async () => {
      storage.send.mockResolvedValue({ Contents: [], IsTruncated: false });

      await draftStorage.deleteStagingPrefix('u1', 'd1');

      const sentNames = storage.send.mock.calls.map((c) => c[0].constructor.name);
      expect(sentNames).not.toContain('DeleteObjectsCommand');
    });
  });
});
