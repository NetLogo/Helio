import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelInteractionService from '#src/modules/model-interaction/model-interaction.service.ts';
import modelInteractionDomain from '#src/modules/model-interaction/domain/model-interaction.domain.ts';
import { ModelInteractionKind } from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelInteractionRepository } from '#src/modules/model-interaction/database/model-interaction.repository.mock.ts';
import { mockModelLikeRepository } from '#src/modules/model-like/database/model-like.repository.mock.ts';
import type { ClientContext } from '#src/shared/http/client-context.ts';

function ctx(overrides: Partial<ClientContext> = {}): ClientContext {
  return {
    userId: 'user-1',
    sessionId: 's',
    ipHash: 'h',
    userAgent: null,
    referer: null,
    cookie: null,
    ...overrides,
  };
}

describe('modelInteractionService', () => {
  const modelInteractionRepository = mockModelInteractionRepository();
  const modelLikeRepository = mockModelLikeRepository();
  const transactionManager = mockTransactionManager();
  const domain = modelInteractionDomain();

  const service = makeModelInteractionService({
    transactionManager,
    modelInteractionRepository,
    modelInteractionDomain: domain,
    modelLikeRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('record', () => {
    it('inserts a non-view interaction without dedupe', async () => {
      await service.record(ModelInteractionKind.run, 'model-1', ctx(), 1);

      expect(modelInteractionRepository.hasRecentMatch).not.toHaveBeenCalled();
      expect(modelInteractionRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          modelId: 'model-1',
          kind: ModelInteractionKind.run,
          versionNumber: 1,
        }),
      );
    });

    it('inserts a view when no recent match exists', async () => {
      modelInteractionRepository.hasRecentMatch.mockResolvedValue(false);

      await service.record(ModelInteractionKind.view, 'model-1', ctx(), null);

      expect(modelInteractionRepository.hasRecentMatch).toHaveBeenCalled();
      expect(modelInteractionRepository.insertTx).toHaveBeenCalledOnce();
    });

    it('drops a view that matches a recent one (dedupe window)', async () => {
      modelInteractionRepository.hasRecentMatch.mockResolvedValue(true);

      await service.record(ModelInteractionKind.view, 'model-1', ctx(), null);

      expect(modelInteractionRepository.insertTx).not.toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    it('returns kind counts plus likes for an authenticated viewer', async () => {
      modelInteractionRepository.countsByKindForModel.mockResolvedValue({
        view: 10,
        run: 4,
        download: 1,
        share: 0,
      });
      modelLikeRepository.countByModel.mockResolvedValue(2);
      modelLikeRepository.existsFor.mockResolvedValue(true);

      const result = await service.summary('model-1', 'user-1');

      expect(result).toEqual({
        view: 10,
        run: 4,
        download: 1,
        share: 0,
        likes: 2,
        likedByMe: true,
      });
    });

    it('returns likedByMe=false without checking existsFor for an anonymous viewer', async () => {
      modelInteractionRepository.countsByKindForModel.mockResolvedValue({
        view: 0,
        run: 0,
        download: 0,
        share: 0,
      });
      modelLikeRepository.countByModel.mockResolvedValue(0);

      const result = await service.summary('model-1', null);

      expect(result.likedByMe).toBe(false);
      expect(modelLikeRepository.existsFor).not.toHaveBeenCalled();
    });
  });
});
