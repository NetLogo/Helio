import { Type, type Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const tagSearchQuerySchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    q: Type.Optional(
      Type.String({
        description: 'Tag name prefix for autocomplete',
        minLength: 1,
        maxLength: 100,
      }),
    ),
  }),
]);
export type TagSearchQuery = Static<typeof tagSearchQuerySchema>;

export const tagIdOrNameParamsSchema = Type.Object({
  idOrName: Type.String({
    description: 'Tag UUID or case-insensitive name',
    minLength: 1,
  }),
});
export type TagIdOrNameParams = Static<typeof tagIdOrNameParamsSchema>;
