import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import type { CommentResponseDto } from '#src/modules/model-comment/dtos/comment.response.dto.ts';
import type { ListCommentsQueryDto } from '#src/modules/model-comment/dtos/list-comments.query.dto.ts';
import type { CommentResponseCtx } from '#src/modules/model-comment/model-comment.mapper.ts';
import {
  commentOrderBy,
  expandCommentTree,
} from '#src/modules/model-comment/queries/list-comments.query.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';

export default function makeGetCommentQuery({ modelCommentRepository, modelCommentMapper }: Dependencies) {
  return {
    async execute(
      commentId: string,
      query: ListCommentsQueryDto,
      ctx: CommentResponseCtx = {},
    ): Promise<CommentResponseDto> {
      const target = await modelCommentRepository.findById(commentId, ctx.viewerId);
      if (!target) throw new CommentNotFoundError(commentId);

      // The re-rooted comment's own reply page honors the caller's
      // `page`/`limit`/`sort` (default limit 20, per plan §8); deeper levels
      // fall back to the fixed bounded-embed defaults inside `expandCommentTree`.
      // Spread `query` rather than naming `limit`/`page` explicitly: `paginatedQueryBase`
      // only fills in its defaults for an *absent* key, not an explicit `undefined` value.
      const repliesParams = paginatedQueryBase({ ...query, orderBy: commentOrderBy(query.sort) });

      return expandCommentTree(
        { modelCommentRepository, modelCommentMapper },
        target,
        0,
        ctx,
        repliesParams,
      );
    },
  };
}
