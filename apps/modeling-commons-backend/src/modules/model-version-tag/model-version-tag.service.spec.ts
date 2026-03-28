import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelVersionTagService from '#src/modules/model-version-tag/model-version-tag.service.ts';
import modelVersionTagDomain from '#src/modules/model-version-tag/domain/model-version-tag.domain.ts';
import { TagAlreadyAppliedError } from '#src/modules/model-version-tag/domain/model-version-tag.errors.ts';
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelVersionTagRepository } from '#src/modules/model-version-tag/database/model-version-tag.repository.mock.ts';
import { mockModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';

function makeVersion(overrides: Partial<ModelVersionEntity> = {}): ModelVersionEntity {
  return {
    id: 'v1',
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

describe('modelVersionTagService', () => {
  const modelVersionTagRepository = mockModelVersionTagRepository();
  const modelVersionRepository = mockModelVersionRepository();
  const tagService = { upsertByName: vi.fn() };
  const eventRepository = mockEventRepository();
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
      modelVersionTagRepository.exists.mockResolvedValue(false);

      const result = await service.add('model-1', 'user-1', 'ecology');

      expect(result.modelVersionId).toBe('v1');
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
      modelVersionTagRepository.exists.mockResolvedValue(true);

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
      const tags = [{ modelVersionId: 'v1', tagId: 'tag-1' }];
      modelVersionTagRepository.findByVersionId.mockResolvedValue(tags);

      const result = await service.listByVersion('v1');

      expect(result).toBe(tags);
    });
  });
});
