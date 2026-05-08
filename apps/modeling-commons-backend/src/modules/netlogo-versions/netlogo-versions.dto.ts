import { Type } from '@fastify/type-provider-typebox';

export const NetlogoVersionsQuerySchema = Type.Object({
  prefix: Type.Optional(
    Type.String({
      description: 'Version prefix to search for',
      maxLength: 100,
    }),
  ),
});

export const NetlogoVersionsResponseDtoSchema = Type.Array(Type.String());
