import type {
  ModelAdditionalFileEntity,
  ModelFileKind,
} from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';

export type ModelAdditionalFileRecord = {
  id: string;
  modelId: string;
  taggedVersionNumber: number;
  fileKey: string;
  kind: ModelFileKind;
  createdAt: Date;
};

export default function modelAdditionalFileMapper() {
  return {
    toDomain(record: ModelAdditionalFileRecord): ModelAdditionalFileEntity {
      return {
        id: record.id,
        modelId: record.modelId,
        taggedVersionNumber: record.taggedVersionNumber,
        fileKey: record.fileKey,
        kind: record.kind,
        createdAt: new Date(record.createdAt),
      };
    },

    toResponse(entity: ModelAdditionalFileEntity) {
      return {
        id: entity.id,
        modelId: entity.modelId,
        taggedVersionNumber: entity.taggedVersionNumber,
        fileKey: entity.fileKey,
        kind: entity.kind,
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
        fileKey: entity.fileKey,
        kind: entity.kind,
        createdAt: entity.createdAt,
      };
    },
  };
}
