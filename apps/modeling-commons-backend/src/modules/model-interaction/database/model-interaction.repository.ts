import type {
  ModelInteractionRepository,
  RecentMatchParams,
} from '#src/modules/model-interaction/database/model-interaction.repository.port.ts';
import {
  ModelInteractionKind,
  type InteractionCounts,
  type ModelInteractionEntity,
} from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

function emptyCounts(): InteractionCounts {
  return {
    [ModelInteractionKind.view]: 0,
    [ModelInteractionKind.run]: 0,
    [ModelInteractionKind.download]: 0,
    [ModelInteractionKind.share]: 0,
  };
}

export default function modelInteractionRepository({
  db,
}: Dependencies): ModelInteractionRepository {
  return {
    async insertTx(ctx: TransactionContext, entity: ModelInteractionEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelInteraction.create({
        data: {
          id: entity.id,
          modelId: entity.modelId,
          versionNumber: entity.versionNumber,
          kind: entity.kind,
          userId: entity.userId,
          sessionId: entity.sessionId,
          ipHash: entity.ipHash,
          userAgent: entity.userAgent,
          referer: entity.referer,
          geo: entity.geo ?? undefined,
          cookie: entity.cookie,
          createdAt: entity.createdAt,
        },
      });
    },

    async hasRecentMatch(params: RecentMatchParams): Promise<boolean> {
      const keys = [params.userId, params.sessionId, params.cookie, params.ipHash].filter(
        (v): v is string => !!v,
      );
      if (keys.length === 0) return false;

      const since = new Date(Date.now() - params.withinMs);

      const row = await db.modelInteraction.findFirst({
        where: {
          modelId: params.modelId,
          kind: params.kind,
          createdAt: { gte: since },
          OR: [
            params.userId ? { userId: params.userId } : null,
            params.sessionId ? { sessionId: params.sessionId } : null,
            params.cookie ? { cookie: params.cookie } : null,
            params.ipHash ? { ipHash: params.ipHash } : null,
          ].filter((v): v is NonNullable<typeof v> => v !== null),
        },
        select: { id: true },
      });
      return row !== null;
    },

    async countByModelAndKind(
      modelId: string,
      kind: ModelInteractionKind,
    ): Promise<number> {
      return db.modelInteraction.count({ where: { modelId, kind } });
    },

    async countsByKindForModel(modelId: string): Promise<InteractionCounts> {
      const rows = await db.modelInteraction.groupBy({
        by: ['kind'],
        where: { modelId },
        _count: { _all: true },
      });
      const out = emptyCounts();
      for (const r of rows) out[r.kind as ModelInteractionKind] = r._count._all;
      return out;
    },

    async countsForModels(modelIds: string[]): Promise<Record<string, InteractionCounts>> {
      const out: Record<string, InteractionCounts> = {};
      for (const id of modelIds) out[id] = emptyCounts();
      if (modelIds.length === 0) return out;

      const rows = await db.modelInteraction.groupBy({
        by: ['modelId', 'kind'],
        where: { modelId: { in: modelIds } },
        _count: { _all: true },
      });
      for (const r of rows) {
        out[r.modelId][r.kind as ModelInteractionKind] = r._count._all;
      }
      return out;
    },
  };
}
