import { Type, type Static } from 'typebox';

export const dateRangeQueryRequestDtoSchema = Type.Object({
  fromDate: Type.Optional(
    Type.String({
      format: 'date',
      examples: ['2024-01-01'],
      description: 'Start date for filtering records (inclusive)',
    }),
  ),
  toDate: Type.Optional(
    Type.String({
      format: 'date',
      examples: ['2024-12-31'],
      description: 'End date for filtering records (inclusive)',
    }),
  ),
});

export type DateRangeQueryRequest = Static<typeof dateRangeQueryRequestDtoSchema>;
