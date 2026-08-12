import { Type } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const idDtoSchema = Type.Object({
  id: idSchema("Entity's id"),
});

export const versionNumberDtoSchema = Type.Object({
  versionNumber: Type.Integer({
    minimum: 1,
    example: 1,
    description: "Entity's version number",
  }),
});
