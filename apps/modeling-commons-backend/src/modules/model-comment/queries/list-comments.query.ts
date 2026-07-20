import {
  COMMENT_TREE_DEFAULTS,
  type ModelCommentEntity,
} from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { ModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.port.ts';
import type { CommentResponseDto } from '#src/modules/model-comment/dtos/comment.response.dto.ts';
import type { ListCommentsQueryDto } from '#src/modules/model-comment/dtos/list-comments.query.dto.ts';
import type { CommentResponseCtx } from '#src/modules/model-comment/model-comment.mapper.ts';
import {
  paginate,
  type OrderBy,
  type Paginated,
  type PaginatedQueryParams,
} from '#src/shared/db/repository.port.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';

const EMBED_LIMIT = COMMENT_TREE_DEFAULTS.maximumShownRepliesPerLevel;

// Deeper levels never honor a caller-supplied sort — a reply thread reads
// chronologically regardless of how the top-level page (or, for `get-comment`,
// the root's own reply page) is sorted.
const EMBED_ORDER_BY: OrderBy = { field: 'createdAt', param: 'asc' };

export const EMBED_PARAMS: PaginatedQueryParams = {
  limit: EMBED_LIMIT,
  page: 0,
  offset: 0,
  orderBy: EMBED_ORDER_BY,
};

export function commentOrderBy(sort?: ListCommentsQueryDto['sort']): OrderBy {
  return { field: sort ?? 'createdAt', param: sort === 'likes' ? 'desc' : 'asc' };
}

type CommentTreeDeps = {
  modelCommentRepository: ModelCommentRepository;
  modelCommentMapper: Dependencies['modelCommentMapper'];
};

// Bounded BFS shared by `list-comments` (a page of roots) and `get-comment`
// (one re-rooted comment): recurse up to `COMMENT_TREE_DEFAULTS.maximumNested`
// levels, embedding at most `maximumShownRepliesPerLevel` replies per node.
// The deepest expanded level's own children aren't fetched, only counted
// (`countRepliesByParent`), so the UI can offer "continue this thread (N)".
// A childless deleted node is dropped from its parent's `replies.data`
// (decision #9); a deleted node with replies is kept.
export async function expandCommentTree(
  deps: CommentTreeDeps,
  entity: ModelCommentEntity,
  depth: number,
  ctx: CommentResponseCtx,
  repliesParams: PaginatedQueryParams,
): Promise<CommentResponseDto> {
  const dto = deps.modelCommentMapper.toResponse(entity, ctx);
  const page = await deps.modelCommentRepository.listReplies(entity.id, repliesParams, ctx.viewerId);
  if (page.count === 0) return dto;

  const nextDepth = depth + 1;
  let data: Array<CommentResponseDto>;

  if (nextDepth < COMMENT_TREE_DEFAULTS.maximumNested) {
    const expandedPairs = await Promise.all(
      page.data.map(async (child) => ({
        child,
        childDto: await expandCommentTree(deps, child, nextDepth, ctx, EMBED_PARAMS),
      })),
    );
    data = expandedPairs
      .filter(({ child, childDto }) => !(child.deletedAt !== null && childDto.replies === undefined))
      .map(({ childDto }) => childDto);
  } else {
    const ids = page.data.map((child) => child.id);
    const counts = await deps.modelCommentRepository.countRepliesByParent(ids);
    data = page.data
      .filter((child) => !(child.deletedAt !== null && (counts.get(child.id) ?? 0) === 0))
      .map((child) => {
        const childDto = deps.modelCommentMapper.toResponse(child, ctx);
        const count = counts.get(child.id) ?? 0;
        if (count > 0) {
          childDto.replies = { count, limit: EMBED_LIMIT, page: 0, data: [] };
        }
        return childDto;
      });
  }

  dto.replies = { count: page.count, limit: page.limit, page: page.page, data };
  return dto;
}

export default function makeListCommentsQuery({
  modelCommentRepository,
  modelCommentMapper,
}: Dependencies) {
  return {
    async execute(
      modelId: string,
      query: ListCommentsQueryDto,
      ctx: CommentResponseCtx = {},
    ): Promise<Paginated<CommentResponseDto>> {
      // Spread `query` rather than naming `limit`/`page` explicitly: `paginatedQueryBase`
      // only fills in its defaults for an *absent* key, not an explicit `undefined` value
      // (its own final spread re-overwrites the default in that case).
      const params = paginatedQueryBase({ ...query, orderBy: commentOrderBy(query.sort) });

      const rootsPage = await modelCommentRepository.listTopLevel(modelId, params, ctx.viewerId);
      const deps: CommentTreeDeps = { modelCommentRepository, modelCommentMapper };

      const expandedPairs = await Promise.all(
        rootsPage.data.map(async (root) => ({
          root,
          dto: await expandCommentTree(deps, root, 0, ctx, EMBED_PARAMS),
        })),
      );
      const roots = expandedPairs
        .filter(({ root, dto }) => !(root.deletedAt !== null && dto.replies === undefined))
        .map(({ dto }) => dto);

      return paginate(roots, params, rootsPage.count);
    },
  };
}
