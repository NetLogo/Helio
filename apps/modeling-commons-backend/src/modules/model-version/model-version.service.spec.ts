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
    changeSummary: null,
    infoTab: null,
    createdAt: new Date(),
    finalizedAt: null,
    ...overrides,
  };
}

describe('modelVersionService', () => {
  const modelVersionRepository = mockModelVersionRepository();
  const modelRepository = mockModelRepository();
  const fileService = { upload: vi.fn().mockResolvedValue('2026/04/17/abcd-model.nlogox') };
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const domain = modelVersionDomain();

  const service = makeModelVersionService({
    transactionManager,
    modelVersionRepository,
    modelVersionDomain: domain,
    modelRepository,
    fileService,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    fileService.upload.mockResolvedValue('2026/04/17/abcd-model.nlogox');
  });

  const nlogoxFile = {
    buffer: Buffer.from('test') as Buffer<ArrayBuffer>,
    filename: 'model.nlogox',
    contentType: 'application/octet-stream',
  };

  describe('create', () => {
    it('uploads file and creates first version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);
      modelVersionRepository.getNextVersionNumberTx.mockResolvedValue(1);

      const versionNumber = await service.create('model-1', 'user-1', nlogoxFile, { title: 'V1' });

      expect(versionNumber).toBeTypeOf('number');
      expect(fileService.upload).toHaveBeenCalledOnce();
      expect(modelVersionRepository.finalizeTx).not.toHaveBeenCalled();
      expect(modelVersionRepository.insertTx).toHaveBeenCalledOnce();
      expect(modelRepository.setLatestVersionTx).toHaveBeenCalledOnce();
    });

    it('finalizes previous version when creating new one', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(makeVersion());
      modelVersionRepository.getNextVersionNumberTx.mockResolvedValue(2);

      await service.create('model-1', 'user-1', nlogoxFile, {});

      expect(modelVersionRepository.finalizeTx).toHaveBeenCalledWith(
        expect.anything(),
        'model-1',
        1,
      );
    });

    it('uses previous title as fallback', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(
        makeVersion({ title: 'Previous' }),
      );
      modelVersionRepository.getNextVersionNumberTx.mockResolvedValue(2);

      await service.create('model-1', 'user-1', nlogoxFile, {});

      expect(modelVersionRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ title: 'Previous' }),
      );
    });

    it('stores the NetLogo version read from the uploaded file', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);
      modelVersionRepository.getNextVersionNumberTx.mockResolvedValue(1);
      const file = {
        ...nlogoxFile,
        buffer: Buffer.from(
          '<?xml version="1.0"?><model version="NetLogo 7.0.0"></model>',
        ) as Buffer<ArrayBuffer>,
      };

      await service.create('model-1', 'user-1', file, {});

      expect(modelVersionRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ netlogoVersion: '7.0.0' }),
      );
    });

    it('reads the NetLogo version before the transaction opens', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);
      modelVersionRepository.getNextVersionNumberTx.mockResolvedValue(1);
      const file = { ...nlogoxFile, buffer: Buffer.from('<?xml ?>') as Buffer<ArrayBuffer> };
      const readContents = vi.spyOn(file.buffer, 'toString');
      const openTransaction = vi.spyOn(transactionManager, 'run');

      await service.create('model-1', 'user-1', file, {});

      expect(readContents.mock.invocationCallOrder[0]).toBeLessThan(
        openTransaction.mock.invocationCallOrder[0] ?? 0,
      );
      openTransaction.mockRestore();
    });

    it('creates the version with no NetLogo version when the file cannot be parsed', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);
      modelVersionRepository.getNextVersionNumberTx.mockResolvedValue(1);

      await service.create('model-1', 'user-1', nlogoxFile, {});

      expect(modelVersionRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ netlogoVersion: null }),
      );
    });
  });

  describe('updateCurrent', () => {
    it('updates current non-finalized version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(makeVersion());

      await service.updateCurrent('model-1', 'user-1', { title: 'Updated' });

      expect(modelVersionRepository.updateFieldsTx).toHaveBeenCalledWith(
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
