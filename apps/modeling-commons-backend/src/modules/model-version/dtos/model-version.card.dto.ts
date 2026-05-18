import { Type, type Static } from 'typebox';
import { modelVersionResponseDtoSchema } from '#src/modules/model-version/dtos/model-version.response.dto.ts';
import { modelResponseDtoSchema } from '#src/modules/model/dtos/model.dto.ts';
import { tagResponseDtoSchema } from '#src/modules/tag/dtos/tag.response.dto.ts';

export const modelVersionCardResponseDtoSchema = Type.Object({
  version: modelVersionResponseDtoSchema,
  model: modelResponseDtoSchema,
  tags: Type.Array(tagResponseDtoSchema),
  netlogoFileDownloadUrl: Type.String(),
  previewImageUrl: Type.Union([Type.String(), Type.Null()]),
});

export type ModelVersionCardResponseDto = Static<typeof modelVersionCardResponseDtoSchema>;
