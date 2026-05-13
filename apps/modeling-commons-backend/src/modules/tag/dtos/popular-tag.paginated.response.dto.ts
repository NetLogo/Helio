import { Type, type Static } from 'typebox';
import { tagResponseDtoSchema } from '#src/modules/tag/dtos/tag.response.dto.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';

export const popularTagResponseDtoSchema = Type.Object({
  tag: tagResponseDtoSchema,
  modelCount: Type.Integer({
    minimum: 0,
    description: 'Number of model versions tagged with this tag',
  }),
});
export type PopularTagResponseDto = Static<typeof popularTagResponseDtoSchema>;

export const popularTagPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(popularTagResponseDtoSchema),
  }),
]);
