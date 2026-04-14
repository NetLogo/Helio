import type { FileEntity } from '#src/modules/file/domain/file.types.ts';

export type FileRecord = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: bigint;
  blob: Buffer<ArrayBuffer>;
  createdAt: Date;
};

export default function fileMapper() {
  return {
    toDomain(record: FileRecord): FileEntity {
      return {
        id: record.id,
        filename: record.filename,
        contentType: record.contentType,
        sizeBytes: record.sizeBytes,
        blob: record.blob,
        createdAt: new Date(record.createdAt),
      };
    },

    toResponse(entity: FileEntity) {
      return {
        id: entity.id,
        filename: entity.filename,
        contentType: entity.contentType,
        sizeBytes: Number(entity.sizeBytes),
        createdAt: entity.createdAt.toISOString(),
      };
    },

    toPersistence(entity: FileEntity): FileRecord {
      return {
        id: entity.id,
        filename: entity.filename,
        contentType: entity.contentType,
        sizeBytes: entity.sizeBytes,
        blob: entity.blob,
        createdAt: entity.createdAt,
      };
    },
  };
}
