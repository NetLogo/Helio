import { Type, type Static } from 'typebox';
import { baseResponseDtoSchema } from '#src/shared/api/response.base.ts';

export const userPublicResponseDtoSchema = Type.Intersect([
  baseResponseDtoSchema,
  Type.Object({
    name: Type.Union([Type.String({ maxLength: 255, examples: ['John Doe'] }), Type.Null()]),
    isProfilePublic: Type.Boolean(),
  }),
]);

export type UserPublicResponseDto = Static<typeof userPublicResponseDtoSchema>;
