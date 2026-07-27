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

// Whitelist mirroring toOrderBy above, but for the raw window query below: only
// these constant Prisma.Sql fragments can reach the ORDER BY clause, so no
// caller-controlled string ever reaches SQL. "id" ASC breaks ties deterministically
// at the ROW_NUMBER() cutoff, where a non-unique sort key would otherwise be flaky.
export function toRawOrderBy(orderBy: OrderBy): Prisma.Sql {
  const column = orderBy.field === 'likes' ? Prisma.sql`"likesCount"` : Prisma.sql`"createdAt"`;
  const direction = orderBy.param === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  return Prisma.sql`${column} ${direction}, "id" ASC`;
}

// Split out from listRepliesByParents so the compiled Prisma.Sql (.sql / .values) can be
// asserted in a unit test without a DB connection - Prisma.sql compiles standalone.
export function buildListRepliesByParentsQuery(
  parentIds: Array<string>,
  params: PaginatedQueryParams,
): Prisma.Sql {
  const offset = Number(params.offset);
  const limit = Number(params.limit);
  return Prisma.sql`
    WITH ranked AS (
      SELECT "id", "parentId",
             ROW_NUMBER() OVER (PARTITION BY "parentId" ORDER BY ${toRawOrderBy(params.orderBy)}) AS rn,
             COUNT(*)     OVER (PARTITION BY "parentId")                                          AS total
      FROM "ModelComment"
      WHERE "parentId" IN (${Prisma.join(parentIds)})
    )
    SELECT "id", "parentId", rn, total FROM ranked
    WHERE rn = 1 OR (rn > ${offset} AND rn <= ${offset + limit})
    ORDER BY "parentId", rn
  `;
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

    // Prisma has no per-group LIMIT, and fetching every reply of every parent to slice in
    // JS is the unbounded materialization this method exists to avoid. The window function
    // is the only way to cap rows per parent in one round trip. Raw SQL only picks row ids;
    // hydration goes through Prisma + modelCommentInclude(viewerId) below, so this path
    // cannot drift from findById / listTopLevel and viewerId never reaches the raw query.
    async listRepliesByParents(
      parentIds: Array<string>,
      params: PaginatedQueryParams,
      viewerId?: string,
    ): Promise<Map<string, Paginated<ModelCommentEntity>>> {
      const result = new Map<string, Paginated<ModelCommentEntity>>();
      if (parentIds.length === 0) return result;

      const offset = Number(params.offset);

      const rows = await db.$queryRaw<Array<{ id: string; parentId: string; rn: bigint; total: bigint }>>(
        buildListRepliesByParentsQuery(parentIds, params),
      );

      const records = await db.modelComment.findMany({
        where: { id: { in: rows.map((row) => row.id) } },
        include: modelCommentInclude(viewerId),
      });
      const byId = new Map(records.map((record) => [record.id, toEntity(record)]));

      for (const row of rows) {
        let page = result.get(row.parentId);
        if (!page) {
          page = { count: Number(row.total), limit: params.limit, page: params.page, data: [] };
          result.set(row.parentId, page);
        }
        // Rank 1 is fetched unconditionally so a parent whose window sits past the end of
        // its replies still reports a truthful total; drop it from `data` here.
        if (Number(row.rn) <= offset) continue;
        const entity = byId.get(row.id);
        if (entity) page.data.push(entity);
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
