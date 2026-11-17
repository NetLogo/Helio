import type { ModelVersionTagEntity } from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import { TagAlreadyAppliedError } from '#src/modules/model-version-tag/domain/model-version-tag.errors.ts';
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';
import { rethrowUniqueViolation } from '#src/shared/db/prisma-error.ts';
import { modelVersionTagEventTypes } from '#src/modules/model-version-tag/model-version-tag.events.ts';

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

      const entity = modelVersionTagDomain.createModelVersionTag({
        modelId: currentVersion.modelId,
        versionNumber: currentVersion.versionNumber,
        tagId: tag.id,
      });

      return rethrowUniqueViolation(
        transactionManager.run(async (ctx) => {
          await modelVersionTagRepository.insertTx(ctx, entity);
          await eventRepository.insertTx(ctx, {
            type: modelVersionTagEventTypes.added,
            actorId: userId,
            resourceType: 'model_version_tag',
            resourceId: `${currentVersion.modelId}:${currentVersion.versionNumber}:${tag.id}`,
            payload: { modelId, tagName: tag.name },
          });
          return entity;
        }),
        () =>
          new TagAlreadyAppliedError(currentVersion.modelId, currentVersion.versionNumber, tag.id),
      );
    },

    async remove(modelId: string, userId: string, tagId: string): Promise<void> {
      const currentVersion = await modelVersionRepository.findLatestByModel(modelId);
      if (!currentVersion) throw new VersionNotFoundError(modelId);
      modelVersionTagDomain.assertNotFinalized(currentVersion);

      await transactionManager.run(async (ctx) => {
        await modelVersionTagRepository.deleteTx(
          ctx,
          currentVersion.modelId,
          currentVersion.versionNumber,
          tagId,
        );
        await eventRepository.insertTx(ctx, {
          type: modelVersionTagEventTypes.removed,
          actorId: userId,
          resourceType: 'model_version_tag',
          resourceId: `${currentVersion.modelId}:${currentVersion.versionNumber}:${tagId}`,
          payload: { modelId, tagId },
        });
      });
    },

    async listByVersion(
      modelId: string,
      versionNumber: number,
    ): Promise<Array<ModelVersionTagEntity>> {
      return modelVersionTagRepository.findByVersion(modelId, versionNumber);
    },
  };
}
