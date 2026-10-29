import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';
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
        pathPrefix: `uploads/models/${modelId}/versions`,
      });

      return transactionManager.run(async (ctx) => {
        const previous = await modelVersionRepository.findLatestByModelTx(modelId);
        if (previous) {
          await modelVersionRepository.finalizeTx(ctx, previous.modelId, previous.versionNumber);
        }

        const versionNumber = await modelVersionRepository.getNextVersionNumberTx(ctx, modelId);
        const entity = modelVersionDomain.createVersion({
          modelId,
          versionNumber,
          title: input.title ?? previous?.title ?? 'Untitled',
          description: input.description,
          previewImageFileKey: input.previewImageFileKey,
          netlogoFileKey,
        });

        await modelVersionRepository.insertTx(ctx, entity);
        await modelRepository.setLatestVersionTx(ctx, modelId, versionNumber);

        await eventRepository.insertTx(ctx, {
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
      const current = await modelVersionRepository.findLatestByModelTx(modelId);
      if (!current) throw new VersionNotFoundError(modelId);
      modelVersionDomain.assertNotFinalized(current);

      await transactionManager.run(async (ctx) => {
        await modelVersionRepository.updateFieldsTx(
          ctx,
          current.modelId,
          current.versionNumber,
          input,
        );
        await eventRepository.insertTx(ctx, {
          type: 'model_version.updated',
          actorId: userId,
          resourceType: 'model_version',
          resourceId: `${modelId}:${current.versionNumber}`,
          payload: { modelId },
        });
      });
    },

    async findNetlogoVersionsByPrefix(prefix: string): Promise<Array<string>> {
      return await modelVersionRepository.findNetlogoVersionsByPrefix(prefix);
    },
  };
}
