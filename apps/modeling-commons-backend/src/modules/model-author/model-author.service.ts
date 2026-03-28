import {
  AuthorAlreadyExistsError,
  NotOwnerError,
} from '#src/modules/model-author/domain/model-author.errors.ts';
import { NotFoundException } from '#src/shared/exceptions/index.ts';

export default function makeModelAuthorService({
  transactionManager,
  modelAuthorRepository,
  modelAuthorDomain,
  eventRepository,
}: Dependencies) {
  async function assertCallerIsOwner(modelId: string, callerId: string) {
    const caller = await modelAuthorRepository.findByCompositeKey(modelId, callerId);
    if (!caller || caller.role !== 'owner') {
      throw new NotOwnerError();
    }
    return caller;
  }

  return {
    async addContributor(modelId: string, userId: string, callerId: string): Promise<void> {
      await assertCallerIsOwner(modelId, callerId);

      const existing = await modelAuthorRepository.findByCompositeKey(modelId, userId);
      if (existing) {
        throw new AuthorAlreadyExistsError(modelId, userId);
      }

      const entity = modelAuthorDomain.createAuthor(modelId, userId, 'contributor');

      await transactionManager.run(async (ctx) => {
        await modelAuthorRepository.insertTx(ctx, entity);
        await eventRepository.insert(ctx, {
          type: 'model_author.added',
          actorId: callerId,
          resourceType: 'model',
          resourceId: modelId,
          payload: { userId, role: 'contributor' },
        });
      });
    },

    async remove(modelId: string, userId: string, callerId: string): Promise<void> {
      await assertCallerIsOwner(modelId, callerId);

      const target = await modelAuthorRepository.findByCompositeKey(modelId, userId);
      if (!target) {
        throw new NotFoundException(`Author not found for model ${modelId} and user ${userId}`);
      }
      modelAuthorDomain.assertNotOwner(target);

      await transactionManager.run(async (ctx) => {
        await modelAuthorRepository.deleteTx(ctx, modelId, userId);
        await eventRepository.insert(ctx, {
          type: 'model_author.removed',
          actorId: callerId,
          resourceType: 'model',
          resourceId: modelId,
          payload: { userId },
        });
      });
    },

    async transferOwnership(modelId: string, newOwnerId: string, callerId: string): Promise<void> {
      await assertCallerIsOwner(modelId, callerId);

      const newOwner = await modelAuthorRepository.findByCompositeKey(modelId, newOwnerId);
      if (!newOwner) {
        throw new NotFoundException(`User ${newOwnerId} is not an author of model ${modelId}`);
      }

      await transactionManager.run(async (ctx) => {
        await modelAuthorRepository.updateRoleTx(ctx, modelId, callerId, 'contributor');
        await modelAuthorRepository.updateRoleTx(ctx, modelId, newOwnerId, 'owner');
        await eventRepository.insert(ctx, {
          type: 'model_author.ownership_transferred',
          actorId: callerId,
          resourceType: 'model',
          resourceId: modelId,
          payload: { previousOwnerId: callerId, newOwnerId },
        });
      });
    },
  };
}
