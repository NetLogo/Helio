import { Type, type Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const eventAdminQuerySchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    type: Type.Optional(Type.String({ description: 'Filter by event type' })),
    resourceType: Type.Optional(Type.String({ description: 'Filter by resource type' })),
    dispatchState: Type.Optional(
      Type.Union([Type.Literal('retry'), Type.Literal('dead')], {
        description: 'Filter by the state of the dispatch job',
      }),
    ),
  }),
]);
export type EventAdminQuery = Static<typeof eventAdminQuerySchema>;
