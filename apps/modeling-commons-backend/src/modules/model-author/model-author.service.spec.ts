import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelAuthorService from '#src/modules/model-author/model-author.service.ts';
import modelAuthorDomain from '#src/modules/model-author/domain/model-author.domain.ts';
import { AuthorAlreadyExistsError, NotOwnerError } from '#src/modules/model-author/domain/model-author.errors.ts';
import { NotFoundException } from '#src/shared/exceptions/index.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelAuthorRepository } from '#src/modules/model-author/database/model-author.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';

describe('modelAuthorService', () => {
  const modelAuthorRepository = mockModelAuthorRepository();
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const domain = modelAuthorDomain();

  const service = makeModelAuthorService({
    transactionManager,
    modelAuthorRepository,
    modelAuthorDomain: domain,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addContributor', () => {
    it('adds contributor when caller is owner', async () => {
      modelAuthorRepository.findByCompositeKey
        .mockResolvedValueOnce({ modelId: 'm1', userId: 'owner', role: 'owner' })
        .mockResolvedValueOnce(undefined);

      await service.addContributor('m1', 'user-2', 'owner');

      expect(modelAuthorRepository.insertTx).toHaveBeenCalledOnce();
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model_author.added' }),
      );
    });

    it('throws NotOwnerError when caller is not owner', async () => {
      modelAuthorRepository.findByCompositeKey.mockResolvedValue({ role: 'contributor' });

      await expect(service.addContributor('m1', 'user-2', 'non-owner')).rejects.toThrow(NotOwnerError);
    });

    it('throws AuthorAlreadyExistsError if user is already an author', async () => {
      modelAuthorRepository.findByCompositeKey
        .mockResolvedValueOnce({ role: 'owner' })
        .mockResolvedValueOnce({ role: 'contributor' });

      await expect(service.addContributor('m1', 'user-2', 'owner')).rejects.toThrow(
        AuthorAlreadyExistsError,
      );
    });
  });

  describe('remove', () => {
    it('removes contributor', async () => {
      modelAuthorRepository.findByCompositeKey
        .mockResolvedValueOnce({ role: 'owner' })
        .mockResolvedValueOnce({ modelId: 'm1', userId: 'user-2', role: 'contributor' });

      await service.remove('m1', 'user-2', 'owner');

      expect(modelAuthorRepository.deleteTx).toHaveBeenCalledOnce();
    });

    it('throws when trying to remove owner', async () => {
      modelAuthorRepository.findByCompositeKey
        .mockResolvedValueOnce({ role: 'owner' })
        .mockResolvedValueOnce({ modelId: 'm1', userId: 'owner', role: 'owner' });

      await expect(service.remove('m1', 'owner', 'owner')).rejects.toThrow();
    });

    it('throws NotFoundException if target is not an author', async () => {
      modelAuthorRepository.findByCompositeKey
        .mockResolvedValueOnce({ role: 'owner' })
        .mockResolvedValueOnce(undefined);

      await expect(service.remove('m1', 'user-2', 'owner')).rejects.toThrow(NotFoundException);
    });
  });

  describe('transferOwnership', () => {
    it('transfers ownership between authors', async () => {
      modelAuthorRepository.findByCompositeKey
        .mockResolvedValueOnce({ role: 'owner' })
        .mockResolvedValueOnce({ role: 'contributor' });

      await service.transferOwnership('m1', 'user-2', 'owner');

      expect(modelAuthorRepository.updateRoleTx).toHaveBeenCalledTimes(2);
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model_author.ownership_transferred' }),
      );
    });

    it('throws if new owner is not an author', async () => {
      modelAuthorRepository.findByCompositeKey
        .mockResolvedValueOnce({ role: 'owner' })
        .mockResolvedValueOnce(undefined);

      await expect(service.transferOwnership('m1', 'user-2', 'owner')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
