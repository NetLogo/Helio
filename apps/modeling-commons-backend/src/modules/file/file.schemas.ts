import { Type, type Static } from 'typebox';

export const fileIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
export type FileIdParams = Static<typeof fileIdParamsSchema>;
