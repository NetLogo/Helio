import { Type, type Static } from 'typebox';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';

export const modelVersionResponseDtoSchema = Type.Intersect([
  idDtoSchema,
  Type.Object({
    modelId: Type.String({ format: 'uuid' }),
    versionNumber: Type.Integer(),
    title: Type.String(),
    description: Type.Union([Type.String(), Type.Null()]),
    nlogoxFileId: Type.String({ format: 'uuid' }),
    netlogoVersion: Type.Union([Type.String(), Type.Null()]),
    infoTab: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String({ format: 'date-time' }),
    isFinalized: Type.Boolean(),
  }),
]);

export type ModelVersionResponseDto = Static<typeof modelVersionResponseDtoSchema>;
