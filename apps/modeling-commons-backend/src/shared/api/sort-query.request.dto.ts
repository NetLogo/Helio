import { Type, type Static, type TSchema } from 'typebox';

export function sortQueryRequestDtoSchema<T extends TSchema>(
  sortBy: T,
): Type.TObject<{
  sortBy: '~optional' extends keyof T ? T : Type.TOptional<T>;
  order: Type.TOptional<Type.TUnion<[Type.TLiteral<'asc'>, Type.TLiteral<'desc'>]>>;
}> {
  return Type.Object({
    sortBy: Type.Optional(sortBy),
    order: Type.Optional(
      Type.Union([Type.Literal('asc'), Type.Literal('desc')], {
        description: 'Sort order, either ascending (asc) or descending (desc)',
        default: 'desc',
      }),
    ),
  });
}

export type SortQueryRequest<T extends TSchema> = Static<
  ReturnType<typeof sortQueryRequestDtoSchema<T>>
>;
