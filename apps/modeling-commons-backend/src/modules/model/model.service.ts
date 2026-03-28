import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import type {
  CreateModelProps,
  ModelEntity,
  UpdateModelProps,
} from '#src/modules/model/domain/model.types.ts';

export default function makeModelService({
  transactionManager,
  modelRepository,
  modelDomain,
  eventRepository,
}: Dependencies) {
  return {
    async create(userId: string, input: CreateModelProps): Promise<string> {
      const entity = modelDomain.createModel(input);

      return transactionManager.run(async (ctx) => {
        await modelRepository.insertTx(ctx, entity);
        await eventRepository.insert(ctx, {
          type: 'model.created',
          actorId: userId,
          resourceType: 'model',
          resourceId: entity.id,
          payload: { title: input.title, visibility: input.visibility ?? 'public' },
        });
        return entity.id;
      });
    },

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

      await transactionManager.run(async (ctx) => {
        await modelRepository.softDelete(ctx, modelId);
        await eventRepository.insert(ctx, {
          type: 'model.deleted',
          actorId: userId,
          resourceType: 'model',
          resourceId: modelId,
          payload: {},
        });
      });
    },

    async findById(modelId: string): Promise<ModelEntity> {
      const model = await modelRepository.findOneById(modelId);
      if (!model) throw new ModelNotFoundError(modelId);
      return model;
    },
  };
}
