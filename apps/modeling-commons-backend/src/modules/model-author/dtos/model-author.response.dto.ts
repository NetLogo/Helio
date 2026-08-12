import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const modelAuthorResponseDtoSchema = Type.Object({
  modelId: idSchema(),
  userId: idSchema(),
  role: Type.Enum(['owner', 'contributor']),
  createdAt: Type.String({
    example: '2020-11-24T17:43:15.970Z',
    description: 'Author assignment date',
  }),
});

export type ModelAuthorResponseDto = Static<typeof modelAuthorResponseDtoSchema>;
