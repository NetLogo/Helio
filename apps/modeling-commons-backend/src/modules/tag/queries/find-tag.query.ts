import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';

export default function makeFindTagQuery({
  tagService,
}: Dependencies) {
  return {
    async execute(idOrName: string): Promise<TagEntity> {
      return tagService.findByIdOrName(idOrName);
    },
  };
}
