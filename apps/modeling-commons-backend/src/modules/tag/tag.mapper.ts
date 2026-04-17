import type { Tag } from '#prisma/index';
import type { TagResponseDto } from '#src/modules/tag/dtos/tag.response.dto.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';

export type TagRecord = Tag;

export default function tagMapper() {
  return createReadOnlyMapper<Tag, TagResponseDto>({
    toResponse: (record) => ({
      id: record.id,
      name: record.name,
      createdAt: record.createdAt.toISOString(),
    }),
  });
}
