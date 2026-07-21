import { Type, type Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const commentSortSchema = Type.Optional(
  Type.Union(
    [Type.Literal('createdAt'), Type.Literal('newest'), Type.Literal('likes')],
    { default: 'likes' },
  ),
);

export const listCommentsQueryDtoSchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({ sort: commentSortSchema }),
]);

export type ListCommentsQueryDto = Static<typeof listCommentsQueryDtoSchema>;
