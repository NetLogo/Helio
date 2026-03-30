import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeFileService from '#src/modules/file/file.service.ts';
import fileDomain from '#src/modules/file/domain/file.domain.ts';
import { FileNotFoundError } from '#src/modules/file/domain/file.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockFileRepository } from '#src/modules/file/database/file.repository.mock.ts';

describe('fileService', () => {
  const fileRepository = mockFileRepository();
  const transactionManager = mockTransactionManager();
  const domain = fileDomain();

  const service = makeFileService({
    transactionManager,
    fileRepository,
    fileDomain: domain,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upload', () => {
    it('creates file entity and inserts via repository', async () => {
      const id = await service.upload(
        Buffer.from('test'),
        'model.nlogox',
        'application/octet-stream',
      );

      expect(id).toBeTypeOf('string');
      expect(fileRepository.insertTx).toHaveBeenCalledOnce();
    });
  });

  describe('getMetadata', () => {
    it('returns metadata when found', async () => {
      const metadata = { id: 'f1', filename: 'test.txt' };
      fileRepository.findMetadataById.mockResolvedValue(metadata);

      const result = await service.getMetadata('f1');

      expect(result).toBe(metadata);
    });

    it('throws FileNotFoundError when not found', async () => {
      fileRepository.findMetadataById.mockResolvedValue(undefined);

      await expect(service.getMetadata('missing')).rejects.toThrow(FileNotFoundError);
    });
  });

  describe('download', () => {
    it('returns file when found', async () => {
      const file = { id: 'f1', blob: Buffer.from('data') };
      fileRepository.findOneById.mockResolvedValue(file);

      const result = await service.download('f1');

      expect(result).toBe(file);
    });

    it('throws FileNotFoundError when not found', async () => {
      fileRepository.findOneById.mockResolvedValue(undefined);

      await expect(service.download('missing')).rejects.toThrow(FileNotFoundError);
    });
  });
});
