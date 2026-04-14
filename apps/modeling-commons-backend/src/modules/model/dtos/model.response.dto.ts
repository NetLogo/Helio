import { Type, type Static } from 'typebox';
import { baseResponseDtoSchema } from '#src/shared/api/response.base.ts';

export const modelResponseDtoSchema = Type.Intersect([
  baseResponseDtoSchema,
  Type.Object({
    latestVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
    parentModelId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    parentVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
    visibility: Type.String({ description: 'public | private | unlisted' }),
    isEndorsed: Type.Boolean(),
  }),
]);

export type ModelResponseDto = Static<typeof modelResponseDtoSchema>;
