import type { Model } from '#prisma/index';
import type { ModelCardRecord } from '#src/modules/model/database/model.card.record.ts';
import { modelCardArgs } from '#src/modules/model/database/model.card.record.ts';
import type { ModelRepository } from '#src/modules/model/database/model.repository.port.ts';
import type { ModelRecord } from '#src/modules/model/database/model.record.ts';
import type { ModelSearchFilters, ModelSortBy } from '#src/modules/model/dtos/model.dto.ts';
import type { ModelVisibility } from '#src/modules/model/shared/enums.ts';
import { ModelInteractionKind } from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

const interactionKindBySortKey: Partial<Record<ModelSortBy, ModelInteractionKind>> = {
  views: ModelInteractionKind.view,
  runs: ModelInteractionKind.run,
  downloads: ModelInteractionKind.download,
};

export default function modelRepository({
  db,
  modelMapper,
  repositoryBase,
}: Dependencies): ModelRepository {
  const tableName = 'model';
  const base = repositoryBase<Model, ModelRecord>({
    tableName,
    mapper: modelMapper,
  });

  return {
    ...base,

    async findByIdIncludeDeleted(id: string): Promise<Model | undefined> {
      const record = await db.model.findUnique({ where: { id } });
      return record ? modelMapper.toDomain(record as unknown as ModelRecord) : undefined;
    },

    async setLatestVersion(
      ctx: TransactionContext,
      modelId: string,
      versionNumber: number,
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.model.update({
        where: { id: modelId },
        data: { latestVersionNumber: versionNumber },
      });
    },

    async softDelete(ctx: TransactionContext, id: string): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.model.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    },

    async insertTx(ctx: TransactionContext, entity: Model): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.model.create({ data: entity });
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
    ): Promise<Paginated<Model>> {
      const where: Record<string, unknown> = { deletedAt: null };

      if (userId) {
        where['AND'] = [
          {
            OR: [
              { visibility: 'public' },
              {
                visibility: 'private',
                OR: [
                  { authors: { some: { userId } } },
                  { permissions: { some: { granteeUserId: userId } } },
                ],
              },
            ],
          },
        ];
      } else {
        where['visibility'] = 'public';
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

      const interactionKind = filters.sortBy
        ? interactionKindBySortKey[filters.sortBy]
        : undefined;

      if (interactionKind) {
        const [count, grouped] = await Promise.all([
          db.model.count({ where }),
          db.modelInteraction.groupBy({
            by: ['modelId'],
            where: { kind: interactionKind, model: where },
            _count: { _all: true },
            orderBy: { _count: { id: 'desc' } },
            skip: params.offset,
            take: params.limit,
          }),
        ]);
        const orderedIds = grouped.map((g) => g.modelId);
        const records = orderedIds.length === 0
          ? []
          : await db.model.findMany({ where: { ...where, id: { in: orderedIds } } });
        const byId = new Map(records.map((r: ModelRecord) => [r.id, r]));
        const sorted = orderedIds
          .map((id) => byId.get(id))
          .filter((r): r is ModelRecord => r !== undefined);

        return {
          count,
          limit: params.limit,
          page: params.page,
          data: sorted.map((r) => modelMapper.toDomain(r)),
        };
      }

      const orderBy =
        filters.sortBy === 'likes'
          ? { likes: { _count: 'desc' as const } }
          : params.orderBy
            ? { [params.orderBy.field]: params.orderBy.param }
            : { createdAt: 'desc' as const };

      const [count, records] = await Promise.all([
        db.model.count({ where }),
        db.model.findMany({
          where,
          orderBy,
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

    async findCard(modelId: string): Promise<ModelCardRecord | null> {
      return db.model.findFirst({
        where: { id: modelId, deletedAt: null },
        ...modelCardArgs,
      });
    },

    async findChildren(
      modelId: string,
      params: PaginatedQueryParams,
    ): Promise<Paginated<Model>> {
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
