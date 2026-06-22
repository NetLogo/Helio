import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelAdditionalFileService from '#src/modules/model-additional-file/model-additional-file.service.ts';
import modelAdditionalFileDomain from '#src/modules/model-additional-file/domain/model-additional-file.domain.ts';
import { AdditionalFileNotFoundError } from '#src/modules/model-additional-file/domain/model-additional-file.errors.ts';
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelAdditionalFileRepository } from '#src/modules/model-additional-file/database/model-additional-file.repository.mock.ts';
import { mockModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';

function makeVersion(overrides: Partial<ModelVersionEntity> = {}): ModelVersionEntity {
  return {
    modelId: 'model-1',
    versionNumber: 1,
    title: 'Test',
    description: null,
    previewImageFileKey: null,
    netlogoFileKey: '2026/04/17/abcd-model.nlogox',
    netlogoVersion: null,
    infoTab: null,
    createdAt: new Date(),
    finalizedAt: null,
    ...overrides,
  };
}

describe('modelAdditionalFileService', () => {
  const modelAdditionalFileRepository = mockModelAdditionalFileRepository();
  const modelVersionRepository = mockModelVersionRepository();
  const fileService = { upload: vi.fn().mockResolvedValue('2026/04/17/abcd-extra.csv') };
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const additionalFileDomain = modelAdditionalFileDomain();

  const service = makeModelAdditionalFileService({
    transactionManager,
    modelAdditionalFileRepository,
    modelAdditionalFileDomain: additionalFileDomain,
    modelVersionRepository,
    fileService,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    fileService.upload.mockResolvedValue('2026/04/17/abcd-extra.csv');
  });

  describe('add', () => {
    it('uploads file and attaches it to the current version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(makeVersion());

      const result = await service.add(
        'model-1',
        'user-1',
        Buffer.from('data') as Buffer<ArrayBuffer>,
        'extra.csv',
        'text/csv',
      );

      expect(result.modelId).toBe('model-1');
      expect(result.taggedVersionNumber).toBe(1);
      expect(result.fileKey).toBe('2026/04/17/abcd-extra.csv');
      expect(result.kind).toBe('additional');
      expect(fileService.upload).toHaveBeenCalledOnce();
      expect(modelAdditionalFileRepository.insertTx).toHaveBeenCalledOnce();
    });

    it('throws VersionNotFoundError if no version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);

      await expect(
        service.add(
          'model-1',
          'user-1',
          Buffer.from('data') as Buffer<ArrayBuffer>,
          'f.csv',
          'text/csv',
        ),
      ).rejects.toThrow(VersionNotFoundError);
    });
  });

  describe('remove', () => {
    it('removes additional file', async () => {
      modelAdditionalFileRepository.findOneById.mockResolvedValue({
        id: 'af-1',
        modelId: 'model-1',
      });

      await service.remove('af-1', 'user-1');

      expect(modelAdditionalFileRepository.deleteTx).toHaveBeenCalledOnce();
    });

    it('throws AdditionalFileNotFoundError if not found', async () => {
      modelAdditionalFileRepository.findOneById.mockResolvedValue(undefined);

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(
        AdditionalFileNotFoundError,
      );
    });
  });

  describe('listByModel', () => {
    it('delegates to repository', async () => {
      const files = [{ id: 'af-1' }];
      modelAdditionalFileRepository.findByModel.mockResolvedValue(files);

      const result = await service.listByModel('model-1');

      expect(result).toBe(files);
    });

    it('passes taggedVersionNumber when provided', async () => {
      modelAdditionalFileRepository.findByModel.mockResolvedValue([]);

      await service.listByModel('model-1', 1);

      expect(modelAdditionalFileRepository.findByModel).toHaveBeenCalledWith('model-1', 1);
    });
  });

  describe('createAdditionalFile domain', () => {
    it('defaults kind to additional', () => {
      const entity = additionalFileDomain.createAdditionalFile({
        modelId: 'model-1',
        taggedVersionNumber: 1,
        fileKey: '2026/04/17/abcd-extra.csv',
      });

      expect(entity.kind).toBe('additional');
    });

    it('honors an explicit kind of model', () => {
      const entity = additionalFileDomain.createAdditionalFile({
        modelId: 'model-1',
        taggedVersionNumber: 1,
        fileKey: '2026/04/17/abcd-model.nlogo',
        kind: 'model',
      });

      expect(entity.kind).toBe('model');
    });
  });
});
