import type { ModelDraftRepository } from '#src/modules/model-draft/database/model-draft.repository.port.ts';
import type { ModelDraftRecord } from '#src/modules/model-draft/database/model-draft.record.ts';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function modelDraftRepository({
  db,
  modelDraftMapper,
}: Dependencies): ModelDraftRepository {
  return {
    async findById(id: string): Promise<ModelDraftEntity | undefined> {
      const record = await db.modelDraft.findUnique({ where: { id } });
      return record
        ? modelDraftMapper.toDomain(record as unknown as ModelDraftRecord)
        : undefined;
    },

    async listByUser(
      userId: string,
      params: PaginatedQueryParams,
    ): Promise<Paginated<ModelDraftEntity>> {
      const where = { userId };
      const [count, records] = await Promise.all([
        db.modelDraft.count({ where }),
        db.modelDraft.findMany({
          where,
          orderBy: params.orderBy
            ? { [params.orderBy.field]: params.orderBy.param }
            : { updatedAt: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
      ]);
      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records.map((r: unknown) =>
          modelDraftMapper.toDomain(r as ModelDraftRecord),
        ),
      };
    },

    async insertTx(ctx: TransactionContext, entity: ModelDraftEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelDraft.create({
        data: {
          id: entity.id,
          userId: entity.userId,
          modelId: entity.modelId,
          schemaVersion: entity.schemaVersion,
          data: entity.data as never,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        },
      });
    },

    async updateDataTx(
      ctx: TransactionContext,
      id: string,
      schemaVersion: number,
      data: unknown,
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelDraft.update({
        where: { id },
        data: { schemaVersion, data: data as never },
      });
    },

    async hardDeleteTx(ctx: TransactionContext, id: string): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelDraft.delete({ where: { id } });
    },

    async deleteStaleBefore(cutoff: Date): Promise<ModelDraftEntity[]> {
      const records = await db.modelDraft.findMany({ where: { updatedAt: { lt: cutoff } } });
      if (records.length === 0) return [];
      await db.modelDraft.deleteMany({
        where: { id: { in: records.map((r) => r.id) } },
      });
      return records.map((r: unknown) =>
        modelDraftMapper.toDomain(r as ModelDraftRecord),
      );
    },
  };
}
