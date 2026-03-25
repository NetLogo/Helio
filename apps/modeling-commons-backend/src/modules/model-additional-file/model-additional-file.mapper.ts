import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelAdditionalFileEntity } from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';
import type { ModelAdditionalFileResponseDto } from '#src/modules/model-additional-file/dtos/model-additional-file.response.dto.ts';

export type ModelAdditionalFileRecord = {
  id: string;
  modelId: string;
  taggedVersionId: string;
  fileId: string;
  createdAt: Date;
};

export default function modelAdditionalFileMapper(): Mapper<
  ModelAdditionalFileEntity,
  ModelAdditionalFileRecord,
  ModelAdditionalFileResponseDto
> {
  return {
    toDomain(record: ModelAdditionalFileRecord): ModelAdditionalFileEntity {
      return {
        id: record.id,
        modelId: record.modelId,
        taggedVersionId: record.taggedVersionId,
        fileId: record.fileId,
        createdAt: new Date(record.createdAt),
      };
    },

    toResponse(entity: ModelAdditionalFileEntity): ModelAdditionalFileResponseDto {
      return {
        id: entity.id,
        modelId: entity.modelId,
        taggedVersionId: entity.taggedVersionId,
        fileId: entity.fileId,
        filename: '',
        contentType: '',
        sizeBytes: 0,
        createdAt: entity.createdAt.toISOString(),
      };
    },

    toPersistence(entity: ModelAdditionalFileEntity): ModelAdditionalFileRecord {
      return {
        id: entity.id,
        modelId: entity.modelId,
        taggedVersionId: entity.taggedVersionId,
        fileId: entity.fileId,
        createdAt: entity.createdAt,
      };
    },
  };
}
