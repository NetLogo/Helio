import { Type } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const idDtoSchema = Type.Object({
  id: idSchema("Entity's id"),
});
