import type { ModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.port.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import type { ModelVersionRecord } from '#src/modules/model-version/model-version.mapper.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function modelVersionRepository({
  db,
  modelVersionMapper,
}: Dependencies): ModelVersionRepository {
  return {
    async insertTx(ctx: TransactionContext, entity: ModelVersionEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      const data = modelVersionMapper.toPersistence(entity);
      await client.modelVersion.create({ data });
    },

    async findByModelAndVersion(
      modelId: string,
      versionNumber: number,
    ): Promise<ModelVersionEntity | undefined> {
      const record = await db.modelVersion.findUnique({
        where: { modelId_versionNumber: { modelId, versionNumber } },
      });
      return record
        ? modelVersionMapper.toDomain(record as unknown as ModelVersionRecord)
        : undefined;
    },

    async findLatestByModel(modelId: string): Promise<ModelVersionEntity | undefined> {
      const record = await db.modelVersion.findFirst({
        where: { modelId },
        orderBy: { versionNumber: 'desc' },
      });
      return record
        ? modelVersionMapper.toDomain(record as unknown as ModelVersionRecord)
        : undefined;
    },

    async finalize(ctx: TransactionContext, modelId: string, versionNumber: number): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelVersion.update({
        where: { modelId_versionNumber: { modelId, versionNumber } },
        data: { finalizedAt: new Date() },
      });
    },

    async updateFields(
      ctx: TransactionContext,
      modelId: string,
      versionNumber: number,
      data: { title?: string; description?: string; previewImage?: Buffer<ArrayBuffer> },
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelVersion.update({
        where: { modelId_versionNumber: { modelId, versionNumber } },
        data,
      });
    },

    async listByModel(
      modelId: string,
      params: PaginatedQueryParams,
    ): Promise<Paginated<ModelVersionEntity>> {
      const where = { modelId };
      const [count, records] = await Promise.all([
        db.modelVersion.count({ where }),
        db.modelVersion.findMany({
          where,
          orderBy: { versionNumber: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
      ]);
      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records.map((r: unknown) => modelVersionMapper.toDomain(r as ModelVersionRecord)),
      };
    },

    async getNextVersionNumber(ctx: TransactionContext, modelId: string): Promise<number> {
      const client = resolveTransaction(ctx);
      const latest = await client.modelVersion.findFirst({
        where: { modelId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      return (latest?.versionNumber ?? 0) + 1;
    },
  };
}
