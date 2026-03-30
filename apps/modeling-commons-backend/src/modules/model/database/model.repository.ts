import type { ModelRepository } from '#src/modules/model/database/model.repository.port.ts';
import type {
  ModelEntity,
  ModelSearchFilters,
  ModelVisibility,
} from '#src/modules/model/domain/model.types.ts';
import type { ModelRecord } from '#src/modules/model/model.mapper.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function modelRepository({
  db,
  modelMapper,
  repositoryBase,
}: Dependencies): ModelRepository {
  const tableName = 'model';
  const base = repositoryBase<ModelEntity, ModelRecord>({
    tableName,
    mapper: modelMapper,
  });

  return {
    ...base,

    async findByIdIncludeDeleted(id: string): Promise<ModelEntity | undefined> {
      const record = await db.model.findUnique({ where: { id } });
      return record ? modelMapper.toDomain(record as unknown as ModelRecord) : undefined;
    },

    async setLatestVersion(
      ctx: TransactionContext,
      modelId: string,
      versionId: string,
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.model.update({
        where: { id: modelId },
        data: { latestVersionId: versionId },
      });
    },

    async softDelete(ctx: TransactionContext, id: string): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.model.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    },

    async insertTx(ctx: TransactionContext, entity: ModelEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      const data = modelMapper.toPersistence(entity);
      await client.model.create({ data });
    },

    async updateFields(
      ctx: TransactionContext,
      id: string,
      data: { visibility?: ModelVisibility; isEndorsed?: boolean },
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.model.update({ where: { id }, data });
    },

    async search(
      filters: ModelSearchFilters,
      params: PaginatedQueryParams,
      userId: string | null,
    ): Promise<Paginated<ModelEntity>> {
      const where: Record<string, unknown> = { deletedAt: null };

      if (filters.visibility) {
        where['visibility'] = filters.visibility;
      } else if (!userId) {
        where['visibility'] = { in: ['public'] };
      }

      if (filters.parentModelId) where['parentModelId'] = filters.parentModelId;
      if (filters.isEndorsed !== undefined) where['isEndorsed'] = filters.isEndorsed;
      if (filters.authorId) where['authors'] = { some: { userId: filters.authorId } };
      if (filters.tag) {
        where['versions'] = {
          some: {
            tags: {
              some: { tag: { name: { equals: filters.tag, mode: 'insensitive' } } },
            },
          },
        };
      }
      if (filters.keyword) {
        where['OR'] = [
          { versions: { some: { title: { contains: filters.keyword, mode: 'insensitive' } } } },
          {
            versions: { some: { description: { contains: filters.keyword, mode: 'insensitive' } } },
          },
        ];
      }

      const [count, records] = await Promise.all([
        db.model.count({ where }),
        db.model.findMany({
          where,
          orderBy: params.orderBy
            ? { [params.orderBy.field]: params.orderBy.param }
            : { createdAt: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
      ]);

      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records.map((r: unknown) => modelMapper.toDomain(r as ModelRecord)),
      };
    },

    async findChildren(
      modelId: string,
      params: PaginatedQueryParams,
    ): Promise<Paginated<ModelEntity>> {
      const where = { parentModelId: modelId, deletedAt: null };
      const [count, records] = await Promise.all([
        db.model.count({ where }),
        db.model.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
      ]);
      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records.map((r: unknown) => modelMapper.toDomain(r as ModelRecord)),
      };
    },
  };
}
