import { Prisma } from '#prisma/index';
import {
  modelCommentInclude,
  type ModelCommentRecord,
} from '#src/modules/model-comment/database/model-comment.record.ts';
import type { ModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.port.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import { paginate, type OrderBy, type PaginatedQueryParams, type Paginated } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

function toEntity(record: ModelCommentRecord): ModelCommentEntity {
  const { user, _count, ...comment } = record;
  return {
    ...comment,
    user: user ?? undefined,
    likedByMe: _count.likes > 0,
  };
}

// `sort` is a DTO-facing name (`likes`), not the Prisma column (`likesCount`);
// this is the one place that reconciles the two. Direction comes from the
// caller-resolved `orderBy.param` (e.g. `newest` -> createdAt desc, `createdAt`
// -> asc for chronological thread reading).
function toOrderBy(orderBy: OrderBy): Prisma.ModelCommentOrderByWithRelationInput {
  if (orderBy.field === 'likes') {
    return { likesCount: orderBy.param };
  }
  return { [orderBy.field]: orderBy.param };
}

export default function modelCommentRepository({ db }: Dependencies): ModelCommentRepository {
  return {
    async findById(id: string, viewerId?: string): Promise<ModelCommentEntity | undefined> {
      const record = await db.modelComment.findUnique({
        where: { id },
        include: modelCommentInclude(viewerId),
      });
      return record ? toEntity(record) : undefined;
    },

    async findByIdTx(ctx: TransactionContext, id: string): Promise<ModelCommentEntity | undefined> {
      const client = resolveTransaction(ctx);
      const record = await client.modelComment.findUnique({
        where: { id },
        include: modelCommentInclude(),
      });
      return record ? toEntity(record) : undefined;
    },

    async listTopLevel(
      modelId: string,
      params: PaginatedQueryParams,
      viewerId?: string,
    ): Promise<Paginated<ModelCommentEntity>> {
      const where = { modelId, parentId: null };
      const [count, records] = await Promise.all([
        db.modelComment.count({ where }),
        db.modelComment.findMany({
          where,
          include: modelCommentInclude(viewerId),
          orderBy: toOrderBy(params.orderBy),
          skip: params.offset,
          take: params.limit,
        }),
      ]);
      return paginate(records.map(toEntity), params, count);
    },

    async listReplies(
      parentId: string,
      params: PaginatedQueryParams,
      viewerId?: string,
    ): Promise<Paginated<ModelCommentEntity>> {
      const where = { parentId };
      const [count, records] = await Promise.all([
        db.modelComment.count({ where }),
        db.modelComment.findMany({
          where,
          include: modelCommentInclude(viewerId),
          orderBy: toOrderBy(params.orderBy),
          skip: params.offset,
          take: params.limit,
        }),
      ]);
      return paginate(records.map(toEntity), params, count);
    },

    async countRepliesByParent(parentIds: Array<string>): Promise<Map<string, number>> {
      const result = new Map<string, number>();
      if (parentIds.length === 0) return result;

      const groups = await db.modelComment.groupBy({
        by: ['parentId'],
        where: { parentId: { in: parentIds } },
        _count: { _all: true },
      });
      for (const group of groups) {
        if (group.parentId) result.set(group.parentId, group._count._all);
      }
      return result;
    },

    async insertTx(ctx: TransactionContext, entity: ModelCommentEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      const { user: _user, likedByMe: _likedByMe, ...data } = entity;
      await client.modelComment.create({ data });
    },

    async updateContentTx(
      ctx: TransactionContext,
      id: string,
      content: string,
      at: Date,
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelComment.update({
        where: { id },
        data: { content, editedAt: at },
      });
    },

    async softDeleteTx(ctx: TransactionContext, id: string, at: Date): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelComment.update({
        where: { id },
        data: { deletedAt: at, content: null },
      });
    },

    async addLikeTx(ctx: TransactionContext, commentId: string, userId: string): Promise<boolean> {
      const client = resolveTransaction(ctx);
      try {
        await client.modelCommentLike.create({ data: { modelCommentId: commentId, userId } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return false;
        }
        throw error;
      }

      await client.modelComment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
      });
      return true;
    },

    async removeLikeTx(ctx: TransactionContext, commentId: string, userId: string): Promise<boolean> {
      const client = resolveTransaction(ctx);
      const deleted = await client.modelCommentLike.deleteMany({
        where: { modelCommentId: commentId, userId },
      });
      if (deleted.count === 0) return false;

      await client.modelComment.updateMany({
        where: { id: commentId, likesCount: { gt: 0 } },
        data: { likesCount: { decrement: 1 } },
      });
      return true;
    },
  };
}
