import type { Model, ModelInteractionKind, Prisma } from '#prisma/index';
import {
  modelCardArgs,
  type ModelCardRecord,
} from '#src/modules/model/database/model.card.record.ts';
import type {
  ModelInteractionCounts,
  ModelRepository,
} from '#src/modules/model/database/model.repository.port.ts';
import type { ModelSearchFilters } from '#src/modules/model/domain/model.types.ts';
import type { ModelVisibility } from '#src/modules/model/shared/enums.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import {
  paginate,
  type Paginated,
  type PaginatedQueryParams,
} from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { buildModelOrderBy, buildModelWhere } from './model.search.ts';

const interactionCountColumn: Record<ModelInteractionKind, keyof Model> = {
  view: 'viewCount',
  run: 'runCount',
  download: 'downloadCount',
  share: 'shareCount',
};

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

      const orderBy = buildModelOrderBy(filters, params);

      const [count, records] = await Promise.all([
        db.model.count({ where }),
        db.model.findMany({ where, orderBy, include, skip: params.offset, take: params.limit }),
      ]);

      return paginate((records as Array<never>).map(map), params, count);
    },

    async incrementInteractionCount(
      ctx: TransactionContext,
      modelId: string,
      kind: ModelInteractionKind,
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      const column = interactionCountColumn[kind];
      await client.model.update({
        where: { id: modelId },
        data: { [column]: { increment: 1 } },
      });
    },

    async findInteractionCounts(modelId: string): Promise<ModelInteractionCounts | null> {
      const record = await db.model.findUnique({
        where: { id: modelId },
        select: { viewCount: true, runCount: true, downloadCount: true, shareCount: true },
      });
      if (!record) return null;
      return {
        view: record.viewCount,
        run: record.runCount,
        download: record.downloadCount,
        share: record.shareCount,
      };
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

    async findRandomPublic(): Promise<{ id: string; title: string } | undefined> {
      const where = {
        visibility: 'public',
        deletedAt: null,
        latestVersionNumber: { not: null },
      } as const;
      const count = await db.model.count({ where });
      if (count === 0) return undefined;
      const skip = Math.floor(Math.random() * count);
      const result = await db.model.findFirst({
        where,
        skip,
        select: { id: true, latestVersion: { select: { title: true } } },
      });
      if (!result?.latestVersion) return undefined;
      return { id: result.id, title: result.latestVersion.title };
    },
  };
}
