import { Type, type Static } from 'typebox';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';

export const modelAdditionalFileResponseDtoSchema = Type.Intersect([
  idDtoSchema,
  Type.Object({
    modelId: Type.String({ format: 'uuid' }),
    taggedVersionId: Type.String({ format: 'uuid' }),
    fileId: Type.String({ format: 'uuid' }),
    filename: Type.String(),
    contentType: Type.String(),
    sizeBytes: Type.Integer(),
    createdAt: Type.String({ format: 'date-time' }),
  }),
]);

export type ModelAdditionalFileResponseDto = Static<typeof modelAdditionalFileResponseDtoSchema>;
