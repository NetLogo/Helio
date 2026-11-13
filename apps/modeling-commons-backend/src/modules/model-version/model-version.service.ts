import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';
import type {
  CreateVersionProps,
  UpdateCurrentVersionProps,
} from '#src/modules/model-version/domain/model-version.types.ts';
import { detectNetlogoVersion } from '#src/shared/utils/netlogo-file.ts';
import { modelVersionEventTypes } from '#src/modules/model-version/model-version.events.ts';

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
      const netlogoVersion = detectNetlogoVersion(nlogoxFile);

      return transactionManager.run(async (ctx) => {
        const previous = await modelVersionRepository.findLatestByModel(modelId, ctx);
        if (previous) {
          await modelVersionRepository.finalizeTx(ctx, previous.modelId, previous.versionNumber);
        }

        const versionNumber = (previous?.versionNumber ?? 0) + 1;
        const entity = modelVersionDomain.createVersion({
          modelId,
          versionNumber,
          title: input.title ?? previous?.title ?? 'Untitled',
          description: input.description,
          previewImageFileKey: input.previewImageFileKey,
          netlogoFileKey,
          netlogoVersion,
        });

        await modelVersionRepository.insertTx(ctx, entity);
        await modelRepository.setLatestVersionTx(ctx, modelId, versionNumber);

        await eventRepository.insertTx(ctx, {
          type: modelVersionEventTypes.created,
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
        await modelVersionRepository.updateFieldsTx(
          ctx,
          current.modelId,
          current.versionNumber,
          input,
        );
        await eventRepository.insertTx(ctx, {
          type: modelVersionEventTypes.updated,
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
