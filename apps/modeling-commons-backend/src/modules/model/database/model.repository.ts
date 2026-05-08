import type { Model, ModelInteractionKind, Prisma } from '#prisma/index';
import {
  modelCardArgs,
  type ModelCardRecord,
} from '#src/modules/model/database/model.card.record.ts';
import type { ModelRepository } from '#src/modules/model/database/model.repository.port.ts';
import type { ModelSearchFilters } from '#src/modules/model/dtos/model.dto.ts';
import type { ModelVisibility } from '#src/modules/model/shared/enums.ts';
import {
  paginate,
  type Paginated,
  type PaginatedQueryParams,
} from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import { buildModelOrderBy, buildModelWhere, interactionKindBySortKey } from './model.search.ts';

export default function modelRepository({
  db,
  modelMapper,
  repositoryBase,
}: Dependencies): ModelRepository {
  const tableName = 'model';
  const base = repositoryBase<Model, Model>({
    tableName,
    mapper: modelMapper,
  });

  return {
    ...base,

    async findByIdIncludeDeleted(id: string): Promise<Model | undefined> {
      const record = await db.model.findUnique({ where: { id } });
      return record ? modelMapper.toDomain(record) : undefined;
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

    /**
     * @description
     * Invariants:
     *  - should always return public models
     *  - should only return private/unlisted models
     *    if user is the author or has explicit permission
     *  - should only return private/unlisted models if `publicOnly` is not true
     *    (defaults to true)
     *  - should never return deleted models
     */
    async search<T>(
      filters: ModelSearchFilters,
      params: PaginatedQueryParams,
      userId: string | null,
      options: {
        include?: Prisma.ModelInclude;
        map: (record: never) => T;
      },
    ): Promise<Paginated<T>> {
      const where = buildModelWhere(filters, userId);
      const { include, map } = options;

      const interactionKind = filters.sortBy ? interactionKindBySortKey[filters.sortBy] : undefined;

      if (interactionKind) {
        const { count, sorted } = await this.fetchByInteraction(where, params, interactionKind, {
          include,
        });
        return paginate((sorted as Array<never>).map(map), params, count);
      }

      const orderBy = buildModelOrderBy(filters, params);

      const [count, records] = await Promise.all([
        db.model.count({ where }),
        db.model.findMany({ where, orderBy, include, skip: params.offset, take: params.limit }),
      ]);

      return paginate((records as Array<never>).map(map), params, count);
    },

    async fetchByInteraction<I extends Prisma.ModelInclude>(
      where: Prisma.ModelWhereInput,
      params: PaginatedQueryParams,
      interactionKind: ModelInteractionKind,
      options: { include?: I },
    ): Promise<{ count: number; sorted: Array<Prisma.ModelGetPayload<{ include: I }>> }> {
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
      if (orderedIds.length === 0) return { count, sorted: [] };

      const records = (await db.model.findMany({
        where: { ...where, id: { in: orderedIds } },
        include: options.include,
      })) as Array<Prisma.ModelGetPayload<{ include: I }> & { id: string }>;

      const byId = new Map(records.map((r) => [r.id, r] as const));
      const sorted = orderedIds
        .map((id) => byId.get(id))
        .filter(
          (r): r is Prisma.ModelGetPayload<{ include: I }> & { id: string } => r !== undefined,
        );

      return { count, sorted };
    },

    async findCard(modelId: string): Promise<ModelCardRecord | null> {
      return db.model.findFirst({
        where: { id: modelId, deletedAt: null },
        ...modelCardArgs,
      });
    },

    async findChildren(modelId: string, params: PaginatedQueryParams): Promise<Paginated<Model>> {
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
      return paginate(
        records.map((r) => modelMapper.toDomain(r)),
        params,
        count,
      );
    },

    async resolveLegacyId(legacyId: number): Promise<string | undefined> {
      const result = await db.model.findUnique({
        where: { legacyId },
        select: { id: true },
      });
      return result?.id;
    },
  };
}
