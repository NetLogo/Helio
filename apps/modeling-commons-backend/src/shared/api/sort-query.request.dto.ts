import { Type, type Static, type TSchema } from 'typebox';

export function sortQueryRequestDtoSchema<T extends TSchema>(sortBy: T) {
  return Type.Object({
    sortBy: Type.Optional(sortBy),
  });
}

export type SortQueryRequest<T extends TSchema> = Static<ReturnType<typeof sortQueryRequestDtoSchema<T>>>;
