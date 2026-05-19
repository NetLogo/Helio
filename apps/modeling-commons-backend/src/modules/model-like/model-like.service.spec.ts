import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelLikeService from '#src/modules/model-like/model-like.service.ts';
import modelLikeDomain from '#src/modules/model-like/domain/model-like.domain.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelLikeRepository } from '#src/modules/model-like/database/model-like.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';

describe('modelLikeService', () => {
  const modelLikeRepository = mockModelLikeRepository();
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const domain = modelLikeDomain();

  const service = makeModelLikeService({
    transactionManager,
    modelLikeRepository,
    modelLikeDomain: domain,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('like', () => {
    it('upserts the like and emits model.liked when newly inserted', async () => {
      modelLikeRepository.upsertTx.mockResolvedValue(true);

      await service.like('model-1', 'user-1');

      expect(modelLikeRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ modelId: 'model-1', userId: 'user-1' }),
      );
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'model.liked',
          actorId: 'user-1',
          resourceType: 'model',
          resourceId: 'model-1',
        }),
      );
    });

    it('does not emit a domain event when the like already exists', async () => {
      modelLikeRepository.upsertTx.mockResolvedValue(false);

      await service.like('model-1', 'user-1');

      expect(eventRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('unlike', () => {
    it('deletes and emits model.unliked when a like was removed', async () => {
      modelLikeRepository.deleteTx.mockResolvedValue(true);

      await service.unlike('model-1', 'user-1');

      expect(modelLikeRepository.deleteTx).toHaveBeenCalledWith(
        expect.anything(),
        'model-1',
        'user-1',
      );
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model.unliked' }),
      );
    });

    it('does not emit an event when nothing was deleted', async () => {
      modelLikeRepository.deleteTx.mockResolvedValue(false);

      await service.unlike('model-1', 'user-1');

      expect(eventRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    it('returns the count and likedByMe for an authenticated viewer', async () => {
      modelLikeRepository.countByModel.mockResolvedValue(3);
      modelLikeRepository.existsFor.mockResolvedValue(true);

      const result = await service.summary('model-1', 'user-1');

      expect(result).toEqual({ count: 3, likedByMe: true });
      expect(modelLikeRepository.existsFor).toHaveBeenCalledWith('model-1', 'user-1');
    });

    it('reports likedByMe=false for an anonymous viewer without hitting existsFor', async () => {
      modelLikeRepository.countByModel.mockResolvedValue(5);

      const result = await service.summary('model-1', null);

      expect(result).toEqual({ count: 5, likedByMe: false });
      expect(modelLikeRepository.existsFor).not.toHaveBeenCalled();
    });
  });
});
