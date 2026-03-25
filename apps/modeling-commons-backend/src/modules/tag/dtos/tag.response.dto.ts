import { Type, type Static } from 'typebox';

export const tagResponseDtoSchema = Type.Object({
  id: Type.String({
    format: 'uuid',
    example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231',
    description: 'Tag id',
  }),
  name: Type.String({ example: 'climate', description: 'Tag name' }),
  createdAt: Type.String({
    example: '2020-11-24T17:43:15.970Z',
    description: 'Tag creation date',
  }),
});

export type TagResponseDto = Static<typeof tagResponseDtoSchema>;
