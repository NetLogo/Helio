import type { TagRepository } from '#src/modules/tag/database/tag.repository.port.ts';
import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type { TagRecord } from '#src/modules/tag/tag.mapper.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';

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
      const where = { name: { startsWith: prefix, mode: 'insensitive' as const } };
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
  };
}
