import type { Tag } from '#prisma/index';
import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';
import type { TagResponseDto } from '#src/modules/tag/dtos/tag.response.dto.ts';

export type TagRecord = Tag;

export default function tagMapper(): Mapper<Tag, Tag, TagResponseDto> {
  return createReadOnlyMapper<Tag, Tag>({
    toResponse: (record) => record,
  });
}
