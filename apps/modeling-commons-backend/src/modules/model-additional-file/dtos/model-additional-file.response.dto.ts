import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';

export const modelAdditionalFileResponseDtoSchema = Type.Intersect([
  idDtoSchema,
  Type.Object({
    modelId: idSchema(),
    userId: Type.Optional(idSchema()),
    taggedVersionNumber: Type.Integer(),
    fileKey: Type.String(),
    kind: Type.Union([Type.Literal('model'), Type.Literal('additional')]),
    filename: Type.String(),
    contentType: Type.String(),
    sizeBytes: Type.Integer(),
    createdAt: Type.String({ format: 'date-time' }),
    downloadUrl: Type.String(),
  }),
]);

export type ModelAdditionalFileResponseDto = Static<typeof modelAdditionalFileResponseDtoSchema>;
