import type { ModelLikeEntity } from '#src/modules/model-like/domain/model-like.types.ts';

export default function modelLikeDomain() {
  return {
    createModelLike(modelId: string, userId: string): ModelLikeEntity {
      return { modelId, userId, createdAt: new Date() };
    },
  };
}
