import { TagNotFoundError } from '#src/modules/tag/domain/tag.errors.ts';
import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type { PopularTag } from '#src/modules/tag/database/tag.repository.port.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';
import type { DateRangeQueryParams } from '#src/shared/db/date-range-query.args.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';

export default function makeTagService({ tagRepository, tagDomain }: Dependencies) {
  return {
    async findByPrefix(
      prefix: string,
      query: { limit?: number; page?: number },
    ): Promise<Paginated<TagEntity>> {
      const params = paginatedQueryBase(query);
      return tagRepository.findByPrefix(prefix, params);
    },

    async listPopular(
      query: { limit?: number; page?: number } & DateRangeQueryParams,
    ): Promise<Paginated<PopularTag>> {
      const params = paginatedQueryBase(query);
      return tagRepository.findPopularWithCounts({
        ...params,
        fromDate: query.fromDate,
        toDate: query.toDate,
      });
    },

    async findByIdOrName(idOrName: string): Promise<TagEntity> {
      const byId = await tagRepository.findOneById(idOrName);
      if (byId) return byId;

      const byName = await tagRepository.findByNameInsensitive(idOrName);
      if (byName) return byName;

      throw new TagNotFoundError(idOrName);
    },

    async upsertByName(name: string): Promise<TagEntity> {
      const validatedName = tagDomain.getPersistenceName(name);
      const existing = await tagRepository.findByNameInsensitive(validatedName);
      if (existing) return existing;

      const entity = tagDomain.createTag({ name: validatedName, displayName: name });
      return tagRepository.upsertByName(entity);
    },
  };
}
