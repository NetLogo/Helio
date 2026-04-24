import type { ModelLikeRepository } from '#src/modules/model-like/database/model-like.repository.port.ts';
import type modelLikeDomain from '#src/modules/model-like/domain/model-like.domain.ts';

declare global {
  export interface Dependencies {
    modelLikeRepository: ModelLikeRepository;
    modelLikeDomain: ReturnType<typeof modelLikeDomain>;
    modelLikeService: ReturnType<
      typeof import('#src/modules/model-like/model-like.service.ts').default
    >;
  }
}
