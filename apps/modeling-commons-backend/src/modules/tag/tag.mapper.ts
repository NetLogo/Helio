import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type { TagResponseDto } from '#src/modules/tag/dtos/tag.response.dto.ts';

export type TagRecord = {
  id: string;
  name: string;
  createdAt: Date;
};

export default function tagMapper(): Mapper<TagEntity, TagRecord, TagResponseDto> {
  return {
    toDomain(record: TagRecord): TagEntity {
      return {
        id: record.id,
        name: record.name,
        createdAt: new Date(record.createdAt),
      };
    },

    toResponse(entity: TagEntity): TagResponseDto {
      return {
        id: entity.id,
        name: entity.name,
        createdAt: entity.createdAt.toISOString(),
      };
    },

    toPersistence(entity: TagEntity): TagRecord {
      return {
        id: entity.id,
        name: entity.name,
        createdAt: entity.createdAt,
      };
    },
  };
}
