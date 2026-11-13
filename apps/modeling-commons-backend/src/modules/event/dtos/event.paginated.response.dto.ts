import { Type } from 'typebox';
import { adminEventResponseDtoSchema } from '#src/modules/event/dtos/event.response.dto.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';

export const eventPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(adminEventResponseDtoSchema),
  }),
]);
