import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const tagResponseDtoSchema = Type.Object({
  id: idSchema('Tag id'),
  name: Type.String({ example: 'climate', description: 'Tag name' }),
  displayName: Type.String({
    example: 'Climate',
    description: 'Formatted tag name for display purposes',
  }),
  createdAt: Type.String({
    example: '2020-11-24T17:43:15.970Z',
    description: 'Tag creation date',
  }),
  legacyId: Type.Optional(Type.Integer({ minimum: 1, description: 'Legacy numeric ID' })),
});

export type TagResponseDto = Static<typeof tagResponseDtoSchema>;
