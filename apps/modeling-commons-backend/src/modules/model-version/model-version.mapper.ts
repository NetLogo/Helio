import type { ModelVersion } from '#prisma/index';
import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';
import type { ModelVersionResponseDto } from '#src/modules/model-version/dtos/model-version.response.dto.ts';

export type ModelVersionRecord = ModelVersion;

export default function modelVersionMapper(): Mapper<ModelVersion, ModelVersion, ModelVersionResponseDto> {
  return createReadOnlyMapper<
    ModelVersion,
    Omit<ModelVersion, 'finalizedAt' | 'previewImage'> & { isFinalized: boolean }
  >({
    toResponse: ({ finalizedAt, previewImage: _previewImage, ...rest }) => ({
      ...rest,
      isFinalized: finalizedAt !== null,
    }),
  });
}
