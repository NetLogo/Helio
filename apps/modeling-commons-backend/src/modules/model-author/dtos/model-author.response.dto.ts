import { Type, type Static } from 'typebox';

export const modelAuthorResponseDtoSchema = Type.Object({
  modelId: Type.String({ format: 'uuid' }),
  userId: Type.String({ format: 'uuid' }),
  role: Type.String({ description: 'owner | contributor' }),
  createdAt: Type.String({
    example: '2020-11-24T17:43:15.970Z',
    description: 'Author assignment date',
  }),
});

export type ModelAuthorResponseDto = Static<typeof modelAuthorResponseDtoSchema>;
