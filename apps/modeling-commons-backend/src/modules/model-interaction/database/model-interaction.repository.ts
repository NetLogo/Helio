import type {
  ModelInteractionRepository,
  RecentMatchParams,
} from '#src/modules/model-interaction/database/model-interaction.repository.port.ts';
import type { ModelInteractionEntity } from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

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
  };
}
