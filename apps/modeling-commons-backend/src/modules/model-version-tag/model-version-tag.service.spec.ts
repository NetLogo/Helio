import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelVersionTagService from '#src/modules/model-version-tag/model-version-tag.service.ts';
import modelVersionTagDomain from '#src/modules/model-version-tag/domain/model-version-tag.domain.ts';
import { TagAlreadyAppliedError } from '#src/modules/model-version-tag/domain/model-version-tag.errors.ts';
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import { makeUniqueViolation } from '#src/shared/test/prisma-errors.ts';
import { mockPort } from '#src/shared/test/mock-port.ts';
import type { ModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.port.ts';
import type { ModelVersionTagRepository } from '#src/modules/model-version-tag/database/model-version-tag.repository.port.ts';
import type { EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';

function makeVersion(overrides: Partial<ModelVersionEntity> = {}): ModelVersionEntity {
  return {
    modelId: 'model-1',
    versionNumber: 1,
    title: 'Test',
    description: null,
    previewImageFileKey: null,
    netlogoFileKey: 'files/key-1',
    netlogoVersion: null,
    changeSummary: null,
    infoTab: null,
    createdAt: new Date(),
    finalizedAt: null,
    ...overrides,
  };
}

describe('modelVersionTagService', () => {
  const modelVersionTagRepository = mockPort<ModelVersionTagRepository>();
  const modelVersionRepository = mockPort<ModelVersionRepository>();
  const tagService = { upsertByName: vi.fn() };
  const eventRepository = mockPort<EventRepositoryPort>();
  const transactionManager = mockTransactionManager();
  const domain = modelVersionTagDomain();

  const service = makeModelVersionTagService({
    transactionManager,
    modelVersionTagRepository,
    modelVersionTagDomain: domain,
    modelVersionRepository,
    tagService,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('add', () => {
    it('adds tag to current version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(makeVersion());
      tagService.upsertByName.mockResolvedValue({ id: 'tag-1', name: 'ecology' });

      const result = await service.add('model-1', 'user-1', 'ecology');

      expect(result.modelId).toBe('model-1');
      expect(result.versionNumber).toBe(1);
      expect(result.tagId).toBe('tag-1');
      expect(modelVersionTagRepository.insertTx).toHaveBeenCalledOnce();
    });

    it('throws VersionNotFoundError if no version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);

      await expect(service.add('model-1', 'user-1', 'tag')).rejects.toThrow(VersionNotFoundError);
    });

    it('throws TagAlreadyAppliedError if tag exists on version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(makeVersion());
      tagService.upsertByName.mockResolvedValue({ id: 'tag-1', name: 'ecology' });
      modelVersionTagRepository.insertTx.mockRejectedValueOnce(makeUniqueViolation());

      await expect(service.add('model-1', 'user-1', 'ecology')).rejects.toThrow(
        TagAlreadyAppliedError,
      );
    });

    it('throws on finalized version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(
        makeVersion({ finalizedAt: new Date() }),
      );

      await expect(service.add('model-1', 'user-1', 'tag')).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('removes tag from current version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(makeVersion());

      await service.remove('model-1', 'user-1', 'tag-1');

      expect(modelVersionTagRepository.deleteTx).toHaveBeenCalledOnce();
    });

    it('throws VersionNotFoundError if no version', async () => {
      modelVersionRepository.findLatestByModel.mockResolvedValue(undefined);

      await expect(service.remove('model-1', 'user-1', 'tag-1')).rejects.toThrow(
        VersionNotFoundError,
      );
    });
  });

  describe('listByVersion', () => {
    it('delegates to repository', async () => {
      const tags = [{ modelId: 'model-1', versionNumber: 1, tagId: 'tag-1' }];
      modelVersionTagRepository.findByVersion.mockResolvedValue(tags);

      const result = await service.listByVersion('model-1', 1);

      expect(result).toBe(tags);
    });
  });
});
