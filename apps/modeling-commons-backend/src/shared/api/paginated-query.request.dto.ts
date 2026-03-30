import { Type } from 'typebox';

export const paginatedQueryRequestDtoSchema = Type.Object(
  {
    limit: Type.Optional(
      Type.Number({
        example: 10,
        description: 'Specifies a limit of returned records',
        minimum: 1,
        maximum: 100,
        default: 20,
      }),
    ),
    page: Type.Optional(
      Type.Number({
        example: 0,
        description: 'Page number',
        minimum: 0,
        default: 0,
      }),
    ),
  },
  { $id: 'PaginatedQueryRequest' },
);
