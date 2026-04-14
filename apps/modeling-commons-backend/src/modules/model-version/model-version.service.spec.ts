import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelVersionService from '#src/modules/model-version/model-version.service.ts';
import modelVersionDomain from '#src/modules/model-version/domain/model-version.domain.ts';
import {
  VersionNotFoundError,
  VersionFinalizedError,
} from '#src/modules/model-version/domain/model-version.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.mock.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';
import { mockFileRepository } from '#src/modules/file/database/file.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';

function makeVersion(overrides: Partial<ModelVersionEntity> = {}): ModelVersionEntity {
  return {
    modelId: 'model-1',
    versionNumber: 1,
    title: 'Test',
    description: null,
    previewImage: null,
    nlogoxFileId: 'file-1',
    netlogoVersion: null,
    infoTab: null,
    createdAt: new Date(),
    finalizedAt: null,
    ...overrides,
  };
}

describe('modelVersionService', () => {
  const modelVersionRepository = mockModelVersionRepository();
  const modelRepository = mockModelRepository();
  const fileRepository = mockFileRepository();
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const domain = modelVersionDomain();

  const service = makeModelVersionService({
    transactionManager,
    modelVersionRepository,
    modelVersionDomain: domain,
    modelRepository,
    fileRepository,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const nlogoxFile = {
    buffer: Buffer.from('test'),
    filename: 'model.nlogox',
    contentType: 'application/octet-stream',
  };

  describe('create', () => {
    it('creates first version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);
      modelVersionRepository.getNextVersionNumber.mockResolvedValue(1);

      const versionNumber = await service.create('model-1', 'user-1', nlogoxFile, { title: 'V1' });

      expect(versionNumber).toBeTypeOf('number');
      expect(modelVersionRepository.finalize).not.toHaveBeenCalled();
      expect(modelVersionRepository.insertTx).toHaveBeenCalledOnce();
      expect(modelRepository.setLatestVersion).toHaveBeenCalledOnce();
    });

    it('finalizes previous version when creating new one', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(makeVersion());
      modelVersionRepository.getNextVersionNumber.mockResolvedValue(2);

      await service.create('model-1', 'user-1', nlogoxFile, {});

      expect(modelVersionRepository.finalize).toHaveBeenCalledWith(expect.anything(), 'model-1', 1);
    });

    it('uses previous title as fallback', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(
        makeVersion({ title: 'Previous' }),
      );
      modelVersionRepository.getNextVersionNumber.mockResolvedValue(2);

      await service.create('model-1', 'user-1', nlogoxFile, {});

      expect(modelVersionRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ title: 'Previous' }),
      );
    });
  });

  describe('updateCurrent', () => {
    it('updates current non-finalized version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(makeVersion());

      await service.updateCurrent('model-1', 'user-1', { title: 'Updated' });

      expect(modelVersionRepository.updateFields).toHaveBeenCalledWith(
        expect.anything(),
        'model-1',
        1,
        { title: 'Updated' },
      );
    });

    it('throws VersionNotFoundError if no version exists', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);

      await expect(service.updateCurrent('model-1', 'user-1', { title: 'X' })).rejects.toThrow(
        VersionNotFoundError,
      );
    });

    it('throws VersionFinalizedError if version is finalized', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(
        makeVersion({ finalizedAt: new Date() }),
      );

      await expect(service.updateCurrent('model-1', 'user-1', { title: 'X' })).rejects.toThrow(
        VersionFinalizedError,
      );
    });
  });
});
