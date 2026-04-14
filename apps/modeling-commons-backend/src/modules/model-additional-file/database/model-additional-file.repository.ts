import type { ModelAdditionalFileRepository } from '#src/modules/model-additional-file/database/model-additional-file.repository.port.ts';
import type { ModelAdditionalFileEntity } from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';
import type { ModelAdditionalFileRecord } from '#src/modules/model-additional-file/model-additional-file.mapper.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function modelAdditionalFileRepository({
  db,
  modelAdditionalFileMapper,
}: Dependencies): ModelAdditionalFileRepository {
  return {
    async insertTx(ctx: TransactionContext, entity: ModelAdditionalFileEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      const data = modelAdditionalFileMapper.toPersistence(entity);
      await client.modelAdditionalFile.create({ data });
    },

    async deleteTx(ctx: TransactionContext, id: string): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelAdditionalFile.delete({ where: { id } });
    },

    async findOneById(id: string): Promise<ModelAdditionalFileEntity | undefined> {
      const record = await db.modelAdditionalFile.findUnique({ where: { id } });
      return record
        ? modelAdditionalFileMapper.toDomain(record as unknown as ModelAdditionalFileRecord)
        : undefined;
    },

    async findByModel(
      modelId: string,
      taggedVersionNumber?: number,
    ): Promise<ModelAdditionalFileEntity[]> {
      const where: Record<string, unknown> = { modelId };
      if (taggedVersionNumber) {
        where['taggedVersionNumber'] = taggedVersionNumber;
      }
      const records = await db.modelAdditionalFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r: unknown) =>
        modelAdditionalFileMapper.toDomain(r as ModelAdditionalFileRecord),
      );
    },
  };
}
