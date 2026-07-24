import type { Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const getCommentQueryDtoSchema = paginatedQueryRequestDtoSchema;

export type GetCommentQueryDto = Static<typeof getCommentQueryDtoSchema>;
