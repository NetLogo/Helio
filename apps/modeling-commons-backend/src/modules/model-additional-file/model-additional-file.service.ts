import type { ModelAdditionalFileEntity } from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';
import { AdditionalFileNotFoundError } from '#src/modules/model-additional-file/domain/model-additional-file.errors.ts';
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';

export default function makeModelAdditionalFileService({
  transactionManager,
  modelAdditionalFileRepository,
  modelAdditionalFileDomain,
  modelVersionRepository,
  fileDomain,
  fileRepository,
  eventRepository,
}: Dependencies) {
  return {
    async add(
      modelId: string,
      userId: string,
      fileBuffer: Buffer<ArrayBuffer>,
      filename: string,
      contentType: string,
    ): Promise<ModelAdditionalFileEntity> {
      const currentVersion = await modelVersionRepository.findLatestByModel(modelId);
      if (!currentVersion) throw new VersionNotFoundError(modelId);

      const fileEntity = fileDomain.createFile({ buffer: fileBuffer, filename, contentType });

      const entity = modelAdditionalFileDomain.createAdditionalFile({
        modelId,
        taggedVersionNumber: currentVersion.versionNumber,
        fileId: fileEntity.id,
      });

      return transactionManager.run(async (ctx) => {
        await fileRepository.insertTx(ctx, fileEntity);
        await modelAdditionalFileRepository.insertTx(ctx, entity);
        await eventRepository.insert(ctx, {
          type: 'model_additional_file.added',
          actorId: userId,
          resourceType: 'model_additional_file',
          resourceId: entity.id,
          payload: { modelId, filename },
        });
        return entity;
      });
    },

    async remove(additionalFileId: string, userId: string): Promise<void> {
      const entity = await modelAdditionalFileRepository.findOneById(additionalFileId);
      if (!entity) throw new AdditionalFileNotFoundError(additionalFileId);

      await transactionManager.run(async (ctx) => {
        await modelAdditionalFileRepository.deleteTx(ctx, additionalFileId);
        await eventRepository.insert(ctx, {
          type: 'model_additional_file.deleted',
          actorId: userId,
          resourceType: 'model_additional_file',
          resourceId: additionalFileId,
          payload: { modelId: entity.modelId },
        });
      });
    },

    async listByModel(
      modelId: string,
      taggedVersionNumber?: number,
    ): Promise<ModelAdditionalFileEntity[]> {
      return modelAdditionalFileRepository.findByModel(modelId, taggedVersionNumber);
    },
  };
}
