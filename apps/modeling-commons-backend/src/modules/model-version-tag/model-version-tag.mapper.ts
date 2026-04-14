import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelVersionTagEntity } from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import type { ModelVersionTagResponseDto } from '#src/modules/model-version-tag/dtos/model-version-tag.response.dto.ts';

export type ModelVersionTagRecord = {
  modelId: string;
  versionNumber: number;
  tagId: string;
  createdAt: Date;
};

export default function modelVersionTagMapper(): Mapper<
  ModelVersionTagEntity,
  ModelVersionTagRecord,
  ModelVersionTagResponseDto
> {
  return {
    toDomain(record: ModelVersionTagRecord): ModelVersionTagEntity {
      return {
        modelId: record.modelId,
        versionNumber: record.versionNumber,
        tagId: record.tagId,
        createdAt: new Date(record.createdAt),
      };
    },

    toResponse(entity: ModelVersionTagEntity): ModelVersionTagResponseDto {
      return {
        modelId: entity.modelId,
        versionNumber: entity.versionNumber,
        tagId: entity.tagId,
        tagName: '',
        createdAt: entity.createdAt.toISOString(),
      };
    },

    toPersistence(entity: ModelVersionTagEntity): ModelVersionTagRecord {
      return {
        modelId: entity.modelId,
        versionNumber: entity.versionNumber,
        tagId: entity.tagId,
        createdAt: entity.createdAt,
      };
    },
  };
}
