import type { Tag } from '#prisma/index';
import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';
import type { TagResponseDto } from '#src/modules/tag/dtos/tag.response.dto.ts';

export type TagRecord = Tag;

export default function tagMapper(): Mapper<Tag, Tag, TagResponseDto> {
  return createReadOnlyMapper<Tag, TagResponseDto>({
    toResponse: (record) => ({
      id: record.id,
      name: record.name,
      displayName: record.displayName ?? record.name,
      legacyId: record.legacyId ?? undefined,
      createdAt: record.createdAt.toISOString(),
    }),
  });
}
