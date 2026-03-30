import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelService from '#src/modules/model/model.service.ts';
import modelDomain from '#src/modules/model/domain/model.domain.ts';
import {
  ModelNotFoundError,
  ModelAlreadyDeletedError,
} from '#src/modules/model/domain/model.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import type { ModelEntity } from '#src/modules/model/domain/model.types.ts';

function makeModel(overrides: Partial<ModelEntity> = {}): ModelEntity {
  return {
    id: 'model-1',
    latestVersionId: null,
    parentModelId: null,
    parentVersionId: null,
    visibility: 'public',
    isEndorsed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('modelService', () => {
  const modelRepository = mockModelRepository();
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const domain = modelDomain();

  const service = makeModelService({
    transactionManager,
    modelRepository,
    modelDomain: domain,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('inserts model and emits event', async () => {
      const id = await service.create('user-1', { title: 'Test', visibility: 'public' });

      expect(id).toBeTypeOf('string');
      expect(modelRepository.insertTx).toHaveBeenCalledOnce();
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model.created', actorId: 'user-1' }),
      );
    });

    it('defaults visibility to public', async () => {
      await service.create('user-1', { title: 'Test' });

      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          payload: expect.objectContaining({ visibility: 'public' }),
        }),
      );
    });
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
});
