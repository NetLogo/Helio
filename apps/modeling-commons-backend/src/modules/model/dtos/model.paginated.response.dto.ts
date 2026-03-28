import { Type } from 'typebox';
import { modelResponseDtoSchema } from '#src/modules/model/dtos/model.response.dto.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';

export const modelPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(modelResponseDtoSchema),
  }),
]);
