import { Type, type Static } from 'typebox';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';

export const fileResponseDtoSchema = Type.Intersect([
  idDtoSchema,
  Type.Object({
    filename: Type.String(),
    contentType: Type.String(),
    sizeBytes: Type.Integer(),
    createdAt: Type.String({ format: 'date-time' }),
    downloadUrl: Type.String(),
  }),
]);

export type FileResponseDto = Static<typeof fileResponseDtoSchema>;
