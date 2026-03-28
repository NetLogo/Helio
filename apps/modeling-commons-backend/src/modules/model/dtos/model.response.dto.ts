import { Type, type Static } from 'typebox';
import { baseResponseDtoSchema } from '#src/shared/api/response.base.ts';

export const modelResponseDtoSchema = Type.Intersect([
  baseResponseDtoSchema,
  Type.Object({
    latestVersionId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    parentModelId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    parentVersionId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    visibility: Type.String({ description: 'public | private | unlisted' }),
    isEndorsed: Type.Boolean(),
  }),
]);

export type ModelResponseDto = Static<typeof modelResponseDtoSchema>;
