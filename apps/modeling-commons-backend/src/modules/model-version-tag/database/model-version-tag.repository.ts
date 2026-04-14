import type { ModelVersionTagRepository } from '#src/modules/model-version-tag/database/model-version-tag.repository.port.ts';
import type { ModelVersionTagEntity } from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import type { ModelVersionTagRecord } from '#src/modules/model-version-tag/model-version-tag.mapper.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function modelVersionTagRepository({
  db,
  modelVersionTagMapper,
}: Dependencies): ModelVersionTagRepository {
  return {
    async insertTx(ctx: TransactionContext, entity: ModelVersionTagEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      const data = modelVersionTagMapper.toPersistence(entity);
      await client.modelVersionTag.create({ data });
    },

    async deleteTx(ctx: TransactionContext, modelId: string, versionNumber: number, tagId: string): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelVersionTag.delete({
        where: { modelId_versionNumber_tagId: { modelId, versionNumber, tagId } },
      });
    },

    async findByVersion(modelId: string, versionNumber: number): Promise<ModelVersionTagEntity[]> {
      const records = await db.modelVersionTag.findMany({
        where: { modelId, versionNumber },
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r: unknown) =>
        modelVersionTagMapper.toDomain(r as ModelVersionTagRecord),
      );
    },

    async exists(modelId: string, versionNumber: number, tagId: string): Promise<boolean> {
      const record = await db.modelVersionTag.findUnique({
        where: { modelId_versionNumber_tagId: { modelId, versionNumber, tagId } },
      });
      return record !== null;
    },
  };
}
