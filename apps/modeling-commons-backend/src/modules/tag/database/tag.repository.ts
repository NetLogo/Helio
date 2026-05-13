import type { PopularTag, TagRepository } from '#src/modules/tag/database/tag.repository.port.ts';
import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type { TagRecord } from '#src/modules/tag/tag.mapper.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { DateRangeQueryParams } from '#src/shared/db/date-range-query.args.ts';

export default function tagRepository({
  db,
  tagMapper,
  repositoryBase,
}: Dependencies): TagRepository {
  const tableName = 'tag';
  const base = repositoryBase<TagEntity, TagRecord>({
    tableName,
    mapper: tagMapper,
  });

  return {
    ...base,

    async findByNameInsensitive(name: string): Promise<TagEntity | undefined> {
      const record = await db.tag.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      return record ? tagMapper.toDomain(record as unknown as TagRecord) : undefined;
    },

    async findByPrefix(
      prefix: string,
      params: PaginatedQueryParams,
    ): Promise<Paginated<TagEntity>> {
      const where = {
        OR: [
          { name: { startsWith: prefix, mode: 'insensitive' as const } },
          { displayName: { startsWith: prefix, mode: 'insensitive' as const } },
        ],
      };
      const [count, records] = await Promise.all([
        db.tag.count({ where }),
        db.tag.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: params.offset,
          take: params.limit,
        }),
      ]);
      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records.map((r: unknown) => tagMapper.toDomain(r as TagRecord)),
      };
    },

    async upsertByName(entity: TagEntity): Promise<TagEntity> {
      const record = await db.tag.upsert({
        where: { name: entity.name.toLowerCase() },
        update: {},
        create: tagMapper.toPersistence(entity),
      });
      return tagMapper.toDomain(record as unknown as TagRecord);
    },

    async findPopularWithCounts(
      params: PaginatedQueryParams & DateRangeQueryParams,
    ): Promise<Paginated<PopularTag>> {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (params.fromDate) createdAt.gte = new Date(params.fromDate);
      if (params.toDate) createdAt.lte = new Date(params.toDate);
      const where =
        createdAt.gte || createdAt.lte ? { createdAt } : undefined;

      const [totalGroups, grouped] = await Promise.all([
        db.modelVersionTag.groupBy({ by: ['tagId'], where }),
        db.modelVersionTag.groupBy({
          by: ['tagId'],
          where,
          _count: { tagId: true },
          orderBy: { _count: { tagId: 'desc' } },
          skip: params.offset,
          take: params.limit,
        }),
      ]);

      const records = await db.tag.findMany({
        where: { id: { in: grouped.map((g) => g.tagId) } },
      });
      const byId = new Map(records.map((r) => [r.id, r] as const));

      const data = grouped
        .map((g) => {
          const record = byId.get(g.tagId);
          if (!record) return null;
          return {
            tag: tagMapper.toDomain(record as unknown as TagRecord),
            modelCount: g._count.tagId,
          };
        })
        .filter((x): x is PopularTag => x !== null);

      return { count: totalGroups.length, limit: params.limit, page: params.page, data };
    },
  };
}
