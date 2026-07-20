import type { ModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.port.ts';
import type modelCommentDomain from '#src/modules/model-comment/domain/model-comment.domain.ts';

declare global {
  export interface Dependencies {
    modelCommentRepository: ModelCommentRepository;
    modelCommentDomain: ReturnType<typeof modelCommentDomain>;
    modelCommentService: ReturnType<
      typeof import('#src/modules/model-comment/model-comment.service.ts').default
    >;
  }
}
