import rules from '#src/config/rules.ts';
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

export const EMBED_ORDER_BY: OrderBy = { field: 'createdAt', param: 'asc' };

export const EMBED_PARAMS: PaginatedQueryParams = {
  limit: EMBED_LIMIT,
  page: 0,
  offset: 0,
  orderBy: EMBED_ORDER_BY,
};

export function commentOrderBy(sort?: ListCommentsQueryDto['sort']): OrderBy {
  switch (sort ?? 'likes') {
    case 'newest':
      return { field: 'createdAt', param: 'desc' };
    case 'createdAt':
      return { field: 'createdAt', param: 'asc' };
    case 'likes': {
      return { field: 'likes', param: 'desc' };
    }
    default:
      return { field: 'likes', param: 'desc' };
  }
}

type CommentTreeDeps = {
  modelCommentRepository: ModelCommentRepository;
  modelCommentMapper: Dependencies['modelCommentMapper'];
};

// Breadth-first: one batched `listRepliesByParents` call per level instead of
// one `listReplies` call per node.
export async function expandCommentForest(
  deps: CommentTreeDeps,
  roots: Array<ModelCommentEntity>,
  ctx: CommentResponseCtx,
  rootRepliesParams: PaginatedQueryParams,
): Promise<Array<CommentResponseDto>> {
  const dtoById = new Map<string, CommentResponseDto>();
  const attach = (entity: ModelCommentEntity): CommentResponseDto => {
    const dto = deps.modelCommentMapper.toResponse(entity, ctx);
    dtoById.set(entity.id, dto);
    return dto;
  };

  const rootDtos = roots.map(attach);
  let frontier = roots;
  let params = rootRepliesParams;
  let budget = rules.limits.comment.tree.maxNodes - roots.length;

  const countOnly = async (nodes: Array<ModelCommentEntity>, at: PaginatedQueryParams) => {
    const counts = await deps.modelCommentRepository.countRepliesByParent(
      nodes.map((node) => node.id),
    );
    for (const node of nodes) {
      const dto = dtoById.get(node.id);
      const count = counts.get(node.id) ?? 0;
      if (dto && count > 0) {
        dto.replies = { count, limit: at.limit, page: at.page, data: [] };
      }
    }
  };

  for (let level = 0; level < COMMENT_TREE_DEFAULTS.maximumNested; level++) {
    if (frontier.length * params.limit > budget) {
      await countOnly(frontier, params);
      frontier = [];
      break;
    }

    const pages = await deps.modelCommentRepository.listRepliesByParents(
      frontier.map((node) => node.id),
      params,
      ctx.viewerId,
    );

    const next: Array<ModelCommentEntity> = [];
    for (const parent of frontier) {
      const page = pages.get(parent.id);
      const dto = dtoById.get(parent.id);
      if (!page || !dto) continue;
      dto.replies = {
        count: page.count,
        limit: page.limit,
        page: page.page,
        data: page.data.map(attach),
      };
      next.push(...page.data);
    }

    budget -= next.length;
    frontier = next;
    params = EMBED_PARAMS;
  }

  await countOnly(frontier, params);
  return rootDtos;
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
      const params = paginatedQueryBase({ ...query, orderBy: commentOrderBy(query.sort) });

      const rootsPage = await modelCommentRepository.listTopLevel(modelId, params, ctx.viewerId);
      const deps: CommentTreeDeps = { modelCommentRepository, modelCommentMapper };

      const roots = await expandCommentForest(deps, rootsPage.data, ctx, EMBED_PARAMS);

      return paginate(roots, params, rootsPage.count);
    },
  };
}
