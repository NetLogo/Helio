import { Type } from 'typebox';
import { modelAuthorResponseDtoSchema } from '#src/modules/model-author/dtos/model-author.response.dto.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';

export const modelAuthorPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(modelAuthorResponseDtoSchema),
  }),
]);
