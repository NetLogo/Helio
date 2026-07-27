import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import type { CommentResponseDto } from '#src/modules/model-comment/dtos/comment.response.dto.ts';
import type { GetCommentQueryDto } from '#src/modules/model-comment/dtos/get-comment.query.dto.ts';
import type { CommentResponseCtx } from '#src/modules/model-comment/model-comment.mapper.ts';
import {
  EMBED_ORDER_BY,
  expandCommentForest,
} from '#src/modules/model-comment/queries/list-comments.query.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';

export default function makeGetCommentQuery({
  modelCommentRepository,
  modelCommentMapper,
}: Dependencies) {
  return {
    async execute(
      commentId: string,
      query: GetCommentQueryDto,
      ctx: CommentResponseCtx = {},
    ): Promise<CommentResponseDto> {
      const target = await modelCommentRepository.findById(commentId, ctx.viewerId);
      if (!target) throw new CommentNotFoundError(commentId);

      const repliesParams = paginatedQueryBase({ ...query, orderBy: EMBED_ORDER_BY });

      const [result] = await expandCommentForest(
        { modelCommentRepository, modelCommentMapper },
        [target],
        ctx,
        repliesParams,
      );
      return result!;
    },
  };
}
