import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { FileEntity } from '#src/modules/file/domain/file.types.ts';
import type { FileResponseDto } from '#src/modules/file/dtos/file.response.dto.ts';

export type FileRecord = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: bigint;
  blob: Buffer<ArrayBuffer>;
  createdAt: Date;
};

export default function fileMapper(): Mapper<FileEntity, FileRecord, FileResponseDto> {
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

    toResponse(entity: FileEntity): FileResponseDto {
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
