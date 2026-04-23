import type { Model } from '#prisma/index';
import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import type {
  CreateModelProps,
  CreateModelResult,
  UpdateModelProps,
} from '#src/modules/model/dtos/model.dto.ts';

export default function makeModelService({
  transactionManager,
  modelRepository,
  modelDomain,
  modelAuthorRepository,
  modelAuthorDomain,
  eventRepository,
  modelVersionRepository,
  modelVersionDomain,
  permissionService,
}: Dependencies) {
  return {
    async create(userId: string, input: CreateModelProps): Promise<CreateModelResult> {
      const entity = modelDomain.createModel(input);
      const draft = modelVersionDomain.createDraftVersion({
        modelId: entity.id,
        title: input.title,
        description: input.description,
      });
      const owner = modelAuthorDomain.createAuthor(entity.id, userId, 'owner');

      return transactionManager.run(async (ctx) => {
        await modelRepository.insertTx(ctx, entity);
        await modelAuthorRepository.insertTx(ctx, owner);
        await modelVersionRepository.insertTx(ctx, draft);

        await eventRepository.insert(ctx, {
          type: 'model.created',
          actorId: userId,
          resourceType: 'model',
          resourceId: entity.id,
          payload: { title: input.title, visibility: entity.visibility },
        });
        await eventRepository.insert(ctx, {
          type: 'model_author.added',
          actorId: userId,
          resourceType: 'model',
          resourceId: entity.id,
          payload: { userId, role: 'owner' },
        });
        return {
          id: entity.id,
          versionNumber: draft.versionNumber,
        };
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

    async findById(modelId: string): Promise<Model> {
      const model = await modelRepository.findOneById(modelId);
      if (!model) throw new ModelNotFoundError(modelId);
      return model;
    },
  };
}
