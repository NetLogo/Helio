export default function makeModelLikeService({
  transactionManager,
  modelLikeRepository,
  modelLikeDomain,
  eventRepository,
}: Dependencies) {
  return {
    async like(modelId: string, userId: string): Promise<void> {
      const entity = modelLikeDomain.createModelLike(modelId, userId);
      await transactionManager.run(async (ctx) => {
        const inserted = await modelLikeRepository.upsertTx(ctx, entity);
        if (inserted) {
          await eventRepository.insert(ctx, {
            type: 'model.liked',
            actorId: userId,
            resourceType: 'model',
            resourceId: modelId,
            payload: {},
          });
        }
      });
    },

    async unlike(modelId: string, userId: string): Promise<void> {
      await transactionManager.run(async (ctx) => {
        const deleted = await modelLikeRepository.deleteTx(ctx, modelId, userId);
        if (deleted) {
          await eventRepository.insert(ctx, {
            type: 'model.unliked',
            actorId: userId,
            resourceType: 'model',
            resourceId: modelId,
            payload: {},
          });
        }
      });
    },

    async summary(
      modelId: string,
      userId: string | null,
    ): Promise<{ count: number; likedByMe: boolean }> {
      const [count, likedByMe] = await Promise.all([
        modelLikeRepository.countByModel(modelId),
        userId ? modelLikeRepository.existsFor(modelId, userId) : Promise.resolve(false),
      ]);
      return { count, likedByMe };
    },
  };
}
