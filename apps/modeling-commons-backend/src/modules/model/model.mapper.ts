import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelEntity } from '#src/modules/model/domain/model.types.ts';
import type { ModelResponseDto } from '#src/modules/model/dtos/model.response.dto.ts';
import { ajv } from '#src/shared/utils/index.ts';
import { ArgumentInvalidException } from '#src/shared/exceptions/index.ts';

export type ModelRecord = {
  id: string;
  latestVersionId: string | null;
  parentModelId: string | null;
  parentVersionId: string | null;
  visibility: string;
  isEndorsed: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const modelSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    visibility: { type: 'string' },
    isEndorsed: { type: 'boolean' },
  },
  required: ['id', 'visibility', 'isEndorsed'],
} as const;

export default function modelMapper(): Mapper<ModelEntity, ModelRecord, ModelResponseDto> {
  const persistenceValidator = ajv.compile(modelSchema);

  return {
    toDomain(record: ModelRecord): ModelEntity {
      return {
        id: record.id,
        latestVersionId: record.latestVersionId,
        parentModelId: record.parentModelId,
        parentVersionId: record.parentVersionId,
        visibility: record.visibility as ModelEntity['visibility'],
        isEndorsed: record.isEndorsed,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
      };
    },

    toResponse(entity: ModelEntity): ModelResponseDto {
      return {
        id: entity.id,
        latestVersionId: entity.latestVersionId,
        parentModelId: entity.parentModelId,
        parentVersionId: entity.parentVersionId,
        visibility: entity.visibility,
        isEndorsed: entity.isEndorsed,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
      };
    },

    toPersistence(entity: ModelEntity): ModelRecord {
      const record: ModelRecord = {
        id: entity.id,
        latestVersionId: entity.latestVersionId,
        parentModelId: entity.parentModelId,
        parentVersionId: entity.parentVersionId,
        visibility: entity.visibility,
        isEndorsed: entity.isEndorsed,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        deletedAt: entity.deletedAt,
      };
      const valid = persistenceValidator(record);
      if (!valid) {
        throw new ArgumentInvalidException(
          JSON.stringify(persistenceValidator.errors),
          new Error('Mapper validation error'),
          record,
        );
      }
      return record;
    },
  };
}
