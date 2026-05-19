import type { ModelLikeRepository } from '#src/modules/model-like/database/model-like.repository.port.ts';
import type { ModelLikeEntity } from '#src/modules/model-like/domain/model-like.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function modelLikeRepository({ db }: Dependencies): ModelLikeRepository {
  return {
    async upsertTx(ctx: TransactionContext, entity: ModelLikeEntity): Promise<boolean> {
      const client = resolveTransaction(ctx);
      const existing = await client.modelLike.findUnique({
        where: { modelId_userId: { modelId: entity.modelId, userId: entity.userId } },
      });
      if (existing) return false;
      await client.modelLike.create({
        data: {
          modelId: entity.modelId,
          userId: entity.userId,
          createdAt: entity.createdAt,
        },
      });
      return true;
    },

    async deleteTx(ctx: TransactionContext, modelId: string, userId: string): Promise<boolean> {
      const client = resolveTransaction(ctx);
      const result = await client.modelLike.deleteMany({
        where: { modelId, userId },
      });
      return result.count > 0;
    },

    async countByModel(modelId: string): Promise<number> {
      return db.modelLike.count({ where: { modelId } });
    },

    async existsFor(modelId: string, userId: string): Promise<boolean> {
      const row = await db.modelLike.findUnique({
        where: { modelId_userId: { modelId, userId } },
      });
      return row !== null;
    },

    async countsForModels(modelIds: Array<string>): Promise<Record<string, number>> {
      if (modelIds.length === 0) return {};
      const rows = await db.modelLike.groupBy({
        by: ['modelId'],
        where: { modelId: { in: modelIds } },
        _count: { _all: true },
      });
      const out: Record<string, number> = {};
      for (const id of modelIds) out[id] = 0;
      for (const r of rows) out[r.modelId] = r._count._all;
      return out;
    },

    async likedModelIdsForUser(userId: string, modelIds: Array<string>): Promise<Set<string>> {
      if (modelIds.length === 0) return new Set();
      const rows = await db.modelLike.findMany({
        where: { userId, modelId: { in: modelIds } },
        select: { modelId: true },
      });
      return new Set(rows.map((r) => r.modelId));
    },
  };
}
