import type { ModelAdditionalFileEntity } from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';

export type ModelAdditionalFileRecord = {
  id: string;
  modelId: string;
  taggedVersionNumber: number;
  fileId: string;
  createdAt: Date;
};

export default function modelAdditionalFileMapper() {
  return {
    toDomain(record: ModelAdditionalFileRecord): ModelAdditionalFileEntity {
      return {
        id: record.id,
        modelId: record.modelId,
        taggedVersionNumber: record.taggedVersionNumber,
        fileId: record.fileId,
        createdAt: new Date(record.createdAt),
      };
    },

    toResponse(entity: ModelAdditionalFileEntity) {
      return {
        id: entity.id,
        modelId: entity.modelId,
        taggedVersionNumber: entity.taggedVersionNumber,
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
        taggedVersionNumber: entity.taggedVersionNumber,
        fileId: entity.fileId,
        createdAt: entity.createdAt,
      };
    },
  };
}
