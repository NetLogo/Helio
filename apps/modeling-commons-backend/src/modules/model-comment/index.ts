import type { ModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.port.ts';
import type modelCommentDomain from '#src/modules/model-comment/domain/model-comment.domain.ts';
import type { ModelCommentMapper } from '#src/modules/model-comment/model-comment.mapper.ts';

declare global {
  export interface Dependencies {
    modelCommentRepository: ModelCommentRepository;
    modelCommentDomain: ReturnType<typeof modelCommentDomain>;
    modelCommentMapper: ModelCommentMapper;
    modelCommentService: ReturnType<
      typeof import('#src/modules/model-comment/model-comment.service.ts').default
    >;
    listCommentsQuery: ReturnType<
      typeof import('#src/modules/model-comment/queries/list-comments.query.ts').default
    >;
    getCommentQuery: ReturnType<
      typeof import('#src/modules/model-comment/queries/get-comment.query.ts').default
    >;
  }
}
