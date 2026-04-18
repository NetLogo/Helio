import {
  VersionNotFoundError,
  VersionPreviewImageNotFoundError,
} from '#src/modules/model-version/domain/model-version.errors.ts';
import type {
  CreateVersionProps,
  UpdateCurrentVersionProps,
} from '#src/modules/model-version/domain/model-version.types.ts';

export default function makeModelVersionService({
  transactionManager,
  modelVersionRepository,
  modelVersionDomain,
  modelRepository,
  fileService,
  eventRepository,
}: Dependencies) {
  return {
    async create(
      modelId: string,
      userId: string,
      nlogoxFile: { buffer: Buffer<ArrayBuffer>; filename: string; contentType: string },
      input: CreateVersionProps,
    ): Promise<number> {
      const netlogoFileKey = await fileService.upload({
        filename: nlogoxFile.filename,
        buffer: nlogoxFile.buffer,
        contentType: nlogoxFile.contentType,
        access: 'private',
        pathPrefix: `models/${modelId}/versions`,
      });

      return transactionManager.run(async (ctx) => {
        const previous = await modelVersionRepository.findLatestByModel(modelId);
        if (previous) {
          await modelVersionRepository.finalize(ctx, previous.modelId, previous.versionNumber);
        }

        const versionNumber = await modelVersionRepository.getNextVersionNumber(ctx, modelId);
        const entity = modelVersionDomain.createVersion({
          modelId,
          versionNumber,
          title: input.title ?? previous?.title ?? 'Untitled',
          description: input.description,
          previewImage: input.previewImage,
          netlogoFileKey,
        });

        await modelVersionRepository.insertTx(ctx, entity);
        await modelRepository.setLatestVersion(ctx, modelId, versionNumber);

        await eventRepository.insert(ctx, {
          type: 'model_version.created',
          actorId: userId,
          resourceType: 'model_version',
          resourceId: `${modelId}:${versionNumber}`,
          payload: { modelId, versionNumber },
        });

        return entity.versionNumber;
      });
    },

    async updateCurrent(
      modelId: string,
      userId: string,
      input: UpdateCurrentVersionProps,
    ): Promise<void> {
      const current = await modelVersionRepository.findLatestByModel(modelId);
      if (!current) throw new VersionNotFoundError(modelId);
      modelVersionDomain.assertNotFinalized(current);

      await transactionManager.run(async (ctx) => {
        await modelVersionRepository.updateFields(
          ctx,
          current.modelId,
          current.versionNumber,
          input,
        );
        await eventRepository.insert(ctx, {
          type: 'model_version.updated',
          actorId: userId,
          resourceType: 'model_version',
          resourceId: `${modelId}:${current.versionNumber}`,
          payload: { modelId },
        });
      });
    },

    async getPreviewImage(modelId: string, versionNumber: number) {
      const version = await modelVersionRepository.findByModelAndVersion(modelId, versionNumber);
      if (!version) throw new VersionNotFoundError(modelId, versionNumber);
      if (!version.previewImage) throw new VersionPreviewImageNotFoundError(modelId, versionNumber);

      return { buffer: version.previewImage, contentType: 'image/png' };
    },
  };
}
