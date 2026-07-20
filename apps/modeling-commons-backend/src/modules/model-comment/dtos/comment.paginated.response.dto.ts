import { Type } from 'typebox';
import { commentResponseDtoSchema } from '#src/modules/model-comment/dtos/comment.response.dto.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';

export const commentPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(commentResponseDtoSchema),
  }),
]);
