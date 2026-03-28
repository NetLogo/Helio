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
  fileRepository,
  eventRepository,
}: Dependencies) {
  return {
    async create(
      modelId: string,
      userId: string,
      nlogoxFile: { buffer: Buffer; filename: string; contentType: string },
      input: CreateVersionProps,
    ): Promise<string> {
      return transactionManager.run(async (ctx) => {
        const previous = await modelVersionRepository.findLatestByModel(modelId);
        if (previous) {
          await modelVersionRepository.finalize(ctx, previous.id);
        }

        const fileDomain = (globalThis as unknown as { fileDomain?: Dependencies['fileDomain'] })
          .fileDomain;
        const fileEntity = fileDomain
          ? fileDomain.createFile(nlogoxFile)
          : {
              id: '',
              ...nlogoxFile,
              sizeBytes: BigInt(nlogoxFile.buffer.length),
              blob: nlogoxFile.buffer,
              createdAt: new Date(),
            };
        await fileRepository.insertTx(
          ctx,
          fileEntity as Parameters<typeof fileRepository.insertTx>[1],
        );

        const versionNumber = await modelVersionRepository.getNextVersionNumber(ctx, modelId);
        const entity = modelVersionDomain.createVersion({
          modelId,
          versionNumber,
          title: input.title ?? previous?.title ?? 'Untitled',
          description: input.description,
          previewImage: input.previewImage,
          nlogoxFileId: fileEntity.id,
        });

        await modelVersionRepository.insertTx(ctx, entity);
        await modelRepository.setLatestVersion(ctx, modelId, entity.id);

        await eventRepository.insert(ctx, {
          type: 'model_version.created',
          actorId: userId,
          resourceType: 'model_version',
          resourceId: entity.id,
          payload: { modelId, versionNumber },
        });

        return entity.id;
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
        await modelVersionRepository.updateFields(ctx, current.id, input);
        await eventRepository.insert(ctx, {
          type: 'model_version.updated',
          actorId: userId,
          resourceType: 'model_version',
          resourceId: current.id,
          payload: { modelId },
        });
      });
    },
  };
}
