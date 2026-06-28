import type { Model } from '#prisma/index';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';
import modelDomain from '#src/modules/model/domain/model.domain.ts';
import {
  ModelAlreadyDeletedError,
  ModelNotFoundError,
} from '#src/modules/model/domain/model.errors.ts';
import makeModelService from '#src/modules/model/model.service.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeModel(overrides: Partial<Model> = {}): Model {
  return {
    id: 'model-1',
    latestVersionNumber: null,
    parentModelId: null,
    parentVersionNumber: null,
    visibility: 'public',
    isEndorsed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    legacyId: null,
    isLibraryModel: false,
    viewCount: 0,
    runCount: 0,
    downloadCount: 0,
    shareCount: 0,
    ...overrides,
  };
}

describe('modelService', () => {
  const modelRepository = mockModelRepository();
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const domain = modelDomain();
  const modelDraftService = {
    purgeForModelTx: vi.fn().mockResolvedValue([]),
    cleanupDraftStaging: vi.fn().mockResolvedValue(undefined),
  };

  const service = makeModelService({
    transactionManager,
    modelRepository,
    modelDomain: domain,
    eventRepository,
    modelDraftService,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('update', () => {
    it('updates model fields', async () => {
      modelRepository.findOneById.mockResolvedValue(makeModel());

      await service.update('model-1', { visibility: 'private' });

      expect(modelRepository.updateFields).toHaveBeenCalledWith(expect.anything(), 'model-1', {
        visibility: 'private',
      });
    });

    it('throws ModelNotFoundError if model does not exist', async () => {
      modelRepository.findOneById.mockResolvedValue(undefined);

      await expect(service.update('missing', {})).rejects.toThrow(ModelNotFoundError);
    });

    it('throws if model is deleted', async () => {
      modelRepository.findOneById.mockResolvedValue(makeModel({ deletedAt: new Date() }));

      await expect(service.update('model-1', {})).rejects.toThrow(ModelAlreadyDeletedError);
    });
  });

  describe('softDelete', () => {
    it('soft deletes and emits event', async () => {
      modelRepository.findOneById.mockResolvedValue(makeModel());

      await service.softDelete('model-1', 'user-1');

      expect(modelRepository.softDelete).toHaveBeenCalledWith(expect.anything(), 'model-1');
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model.deleted' }),
      );
    });

    it('purges drafts within the same transaction as the soft delete', async () => {
      modelRepository.findOneById.mockResolvedValue(makeModel());
      const purged = [{ id: 'draft-1', userId: 'user-1' }];
      modelDraftService.purgeForModelTx.mockResolvedValue(purged);

      await service.softDelete('model-1', 'user-1');

      const ctxArg = modelRepository.softDelete.mock.calls[0]![0];
      expect(modelDraftService.purgeForModelTx).toHaveBeenCalledWith(ctxArg, 'model-1');
      expect(modelDraftService.cleanupDraftStaging).toHaveBeenCalledWith(purged);
    });

    it('does not clean up draft staging when the transaction fails', async () => {
      modelRepository.findOneById.mockResolvedValue(makeModel());
      modelDraftService.purgeForModelTx.mockResolvedValue([]);
      eventRepository.insert.mockRejectedValueOnce(new Error('boom'));

      await expect(service.softDelete('model-1', 'user-1')).rejects.toThrow('boom');
      expect(modelDraftService.cleanupDraftStaging).not.toHaveBeenCalled();
    });

    it('throws if model not found', async () => {
      modelRepository.findOneById.mockResolvedValue(undefined);

      await expect(service.softDelete('missing', 'user-1')).rejects.toThrow(ModelNotFoundError);
    });
  });

  describe('findById', () => {
    it('returns model when found', async () => {
      const model = makeModel();
      modelRepository.findOneById.mockResolvedValue(model);

      const result = await service.findById('model-1');

      expect(result).toBe(model);
    });

    it('throws if model not found', async () => {
      modelRepository.findOneById.mockResolvedValue(undefined);

      await expect(service.findById('missing')).rejects.toThrow(ModelNotFoundError);
    });
  });

  describe('resolveLegacyId', () => {
    it('returns the resolved model id when the legacy id is known', async () => {
      modelRepository.resolveLegacyId.mockResolvedValue('model-1');

      const id = await service.resolveLegacyId(123);

      expect(id).toBe('model-1');
      expect(modelRepository.resolveLegacyId).toHaveBeenCalledWith(123);
    });

    it('throws ModelNotFoundError when the legacy id is unknown', async () => {
      modelRepository.resolveLegacyId.mockResolvedValue(undefined);

      await expect(service.resolveLegacyId(999)).rejects.toThrow(ModelNotFoundError);
    });
  });

  describe('findRandomPublic', () => {
    it('returns the random public model when one exists', async () => {
      modelRepository.findRandomPublic.mockResolvedValue({ id: 'model-1', title: 'Random' });

      const result = await service.findRandomPublic();

      expect(result).toEqual({ id: 'model-1', title: 'Random' });
    });

    it('throws ModelNotFoundError when no public model is available', async () => {
      modelRepository.findRandomPublic.mockResolvedValue(undefined);

      await expect(service.findRandomPublic()).rejects.toThrow(ModelNotFoundError);
    });
  });
});
