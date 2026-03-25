import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import type { ModelVersionResponseDto } from '#src/modules/model-version/dtos/model-version.response.dto.ts';

export type ModelVersionRecord = {
  id: string;
  modelId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  previewImage: Buffer<ArrayBuffer> | null;
  nlogoxFileId: string;
  netlogoVersion: string | null;
  infoTab: string | null;
  createdAt: Date;
  finalizedAt: Date | null;
};

export default function modelVersionMapper(): Mapper<
  ModelVersionEntity,
  ModelVersionRecord,
  ModelVersionResponseDto
> {
  return {
    toDomain(record: ModelVersionRecord): ModelVersionEntity {
      return {
        id: record.id,
        modelId: record.modelId,
        versionNumber: record.versionNumber,
        title: record.title,
        description: record.description,
        previewImage: record.previewImage ?? null,
        nlogoxFileId: record.nlogoxFileId,
        netlogoVersion: record.netlogoVersion,
        infoTab: record.infoTab,
        createdAt: new Date(record.createdAt),
        finalizedAt: record.finalizedAt ? new Date(record.finalizedAt) : null,
      };
    },

    toResponse(entity: ModelVersionEntity): ModelVersionResponseDto {
      return {
        id: entity.id,
        modelId: entity.modelId,
        versionNumber: entity.versionNumber,
        title: entity.title,
        description: entity.description,
        nlogoxFileId: entity.nlogoxFileId,
        netlogoVersion: entity.netlogoVersion,
        infoTab: entity.infoTab,
        createdAt: entity.createdAt.toISOString(),
        isFinalized: entity.finalizedAt !== null,
      };
    },

    toPersistence(entity: ModelVersionEntity): ModelVersionRecord {
      return {
        id: entity.id,
        modelId: entity.modelId,
        versionNumber: entity.versionNumber,
        title: entity.title,
        description: entity.description,
        previewImage: entity.previewImage,
        nlogoxFileId: entity.nlogoxFileId,
        netlogoVersion: entity.netlogoVersion,
        infoTab: entity.infoTab,
        createdAt: entity.createdAt,
        finalizedAt: entity.finalizedAt,
      };
    },
  };
}
