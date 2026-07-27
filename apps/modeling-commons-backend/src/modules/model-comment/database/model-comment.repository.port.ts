import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelCommentRepository {
  findById: (id: string, viewerId?: string) => Promise<ModelCommentEntity | undefined>;
  findByIdTx: (ctx: TransactionContext, id: string) => Promise<ModelCommentEntity | undefined>;

  // Top-level comments of a model (parentId = null).
  listTopLevel: (
    modelId: string,
    params: PaginatedQueryParams,
    viewerId?: string,
  ) => Promise<Paginated<ModelCommentEntity>>;

  // One page of a single parent's direct replies.
  listReplies: (
    parentId: string,
    params: PaginatedQueryParams,
    viewerId?: string,
  ) => Promise<Paginated<ModelCommentEntity>>;

  // Batch total-reply counts (for nodes we embed but don't expand at the depth limit).
  countRepliesByParent: (parentIds: Array<string>) => Promise<Map<string, number>>;

  // Top-L replies for many parents in one pass, keyed by parentId.
  // Parents with no replies are absent from the map (same convention as countRepliesByParent).
  listRepliesByParents: (
    parentIds: Array<string>,
    params: PaginatedQueryParams,
    viewerId?: string,
  ) => Promise<Map<string, Paginated<ModelCommentEntity>>>;

  insertTx: (ctx: TransactionContext, entity: ModelCommentEntity) => Promise<void>;
  updateContentTx: (
    ctx: TransactionContext,
    id: string,
    content: string,
    at: Date,
  ) => Promise<void>;
  softDeleteTx: (ctx: TransactionContext, id: string, at: Date) => Promise<void>;

  addLikeTx: (ctx: TransactionContext, commentId: string, userId: string) => Promise<boolean>; // false if already liked
  removeLikeTx: (ctx: TransactionContext, commentId: string, userId: string) => Promise<boolean>; // false if not liked
}
