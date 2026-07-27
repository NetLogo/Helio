import type { Model } from '#prisma/index';
import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import type { UpdateModelProps } from '#src/modules/model/domain/model.types.ts';

export default function makeModelService({
  transactionManager,
  modelRepository,
  modelDomain,
  eventRepository,
  modelDraftService,
}: Dependencies) {
  return {
    async update(modelId: string, input: UpdateModelProps): Promise<void> {
      const model = await modelRepository.findOneById(modelId);
      if (!model) throw new ModelNotFoundError(modelId);
      modelDomain.assertNotDeleted(model);

      await transactionManager.run(async (ctx) => {
        await modelRepository.updateFields(ctx, modelId, input);
      });
    },

    async softDelete(modelId: string, userId: string): Promise<void> {
      const model = await modelRepository.findOneById(modelId);
      if (!model) throw new ModelNotFoundError(modelId);
      modelDomain.assertNotDeleted(model);

      const purgedDrafts = await transactionManager.run(async (ctx) => {
        await modelRepository.softDelete(ctx, modelId);
        const drafts = await modelDraftService.purgeForModelTx(ctx, modelId);
        await eventRepository.insert(ctx, {
          type: 'model.deleted',
          actorId: userId,
          resourceType: 'model',
          resourceId: modelId,
          payload: {},
        });
        return drafts;
      });

      await modelDraftService.cleanupDraftStaging(purgedDrafts);
    },

    async findById(modelId: string): Promise<Model> {
      const model = await modelRepository.findOneById(modelId);
      if (!model) throw new ModelNotFoundError(modelId);
      return model;
    },

    async resolveLegacyId(legacyId: number): Promise<string> {
      const id = await modelRepository.resolveLegacyId(legacyId);
      if (!id) {
        throw new ModelNotFoundError(`Model with legacy ID ${legacyId} not found`);
      }
      return id;
    },

    async findRandomPublic(): Promise<{ id: string; title: string }> {
      const result = await modelRepository.findRandomPublic();
      if (!result) throw new ModelNotFoundError('No public model available');
      return result;
    },
  };
}
