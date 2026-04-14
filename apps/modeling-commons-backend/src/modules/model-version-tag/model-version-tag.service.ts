import type { ModelVersionTagEntity } from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import { TagAlreadyAppliedError } from '#src/modules/model-version-tag/domain/model-version-tag.errors.ts';
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';

export default function makeModelVersionTagService({
  transactionManager,
  modelVersionTagRepository,
  modelVersionTagDomain,
  modelVersionRepository,
  tagService,
  eventRepository,
}: Dependencies) {
  return {
    async add(modelId: string, userId: string, tagName: string): Promise<ModelVersionTagEntity> {
      const currentVersion = await modelVersionRepository.findLatestByModel(modelId);
      if (!currentVersion) throw new VersionNotFoundError(modelId);
      modelVersionTagDomain.assertNotFinalized(currentVersion);

      const tag = await tagService.upsertByName(tagName);

      const alreadyApplied = await modelVersionTagRepository.exists(currentVersion.modelId, currentVersion.versionNumber, tag.id);
      if (alreadyApplied) throw new TagAlreadyAppliedError(currentVersion.modelId, currentVersion.versionNumber, tag.id);

      const entity = modelVersionTagDomain.createModelVersionTag({
        modelId: currentVersion.modelId,
        versionNumber: currentVersion.versionNumber,
        tagId: tag.id,
      });

      return transactionManager.run(async (ctx) => {
        await modelVersionTagRepository.insertTx(ctx, entity);
        await eventRepository.insert(ctx, {
          type: 'model_version_tag.added',
          actorId: userId,
          resourceType: 'model_version_tag',
          resourceId: `${currentVersion.modelId}:${currentVersion.versionNumber}:${tag.id}`,
          payload: { modelId, tagName: tag.name },
        });
        return entity;
      });
    },

    async remove(modelId: string, userId: string, tagId: string): Promise<void> {
      const currentVersion = await modelVersionRepository.findLatestByModel(modelId);
      if (!currentVersion) throw new VersionNotFoundError(modelId);
      modelVersionTagDomain.assertNotFinalized(currentVersion);

      await transactionManager.run(async (ctx) => {
        await modelVersionTagRepository.deleteTx(ctx, currentVersion.modelId, currentVersion.versionNumber, tagId);
        await eventRepository.insert(ctx, {
          type: 'model_version_tag.removed',
          actorId: userId,
          resourceType: 'model_version_tag',
          resourceId: `${currentVersion.modelId}:${currentVersion.versionNumber}:${tagId}`,
          payload: { modelId, tagId },
        });
      });
    },

    async listByVersion(modelId: string, versionNumber: number): Promise<ModelVersionTagEntity[]> {
      return modelVersionTagRepository.findByVersion(modelId, versionNumber);
    },
  };
}
