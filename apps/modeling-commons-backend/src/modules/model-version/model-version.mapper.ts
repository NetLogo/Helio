import type { ModelVersion } from '#prisma/index';
import type { ModelVersionResponseDto } from '#src/modules/model-version/dtos/model-version.response.dto.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';

export type ModelVersionRecord = ModelVersion;

export default function modelVersionMapper() {
  return createReadOnlyMapper<ModelVersion, ModelVersionResponseDto>({
    toResponse: (record) => ({
      modelId: record.modelId,
      versionNumber: record.versionNumber,
      title: record.title,
      description: record.description,
      nlogoxFileId: record.nlogoxFileId,
      netlogoVersion: record.netlogoVersion,
      infoTab: record.infoTab,
      createdAt: record.createdAt.toISOString(),
      isFinalized: record.finalizedAt !== null,
    }),
  });
}
