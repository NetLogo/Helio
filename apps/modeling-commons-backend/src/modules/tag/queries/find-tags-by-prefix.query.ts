import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export default function makeFindTagsByPrefixQuery({ tagService }: Dependencies) {
  return {
    async execute(
      prefix: string,
      query: { limit?: number; page?: number },
    ): Promise<Paginated<TagEntity>> {
      return tagService.findByPrefix(prefix, query);
    },
  };
}
