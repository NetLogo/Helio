import { TagNotFoundError } from '#src/modules/tag/domain/tag.errors.ts';
import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';
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

    async findByIdOrName(idOrName: string): Promise<TagEntity> {
      const isUuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(idOrName);

      const tag = isUuid
        ? await tagRepository.findOneById(idOrName)
        : await tagRepository.findByNameInsensitive(idOrName);

      if (!tag) throw new TagNotFoundError(idOrName);
      return tag;
    },

    async upsertByName(name: string): Promise<TagEntity> {
      const validatedName = tagDomain.validateName(name);
      const existing = await tagRepository.findByNameInsensitive(validatedName);
      if (existing) return existing;

      const entity = tagDomain.createTag({ name: validatedName });
      return tagRepository.upsertByName(entity);
    },
  };
}
