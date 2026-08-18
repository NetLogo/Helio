import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const additionalFileParamsSchema = Type.Object({
  id: idSchema(),
  fileId: idSchema(),
});
export type AdditionalFileParams = Static<typeof additionalFileParamsSchema>;

export const listAdditionalFilesQuerySchema = Type.Object({
  taggedVersionNumber: Type.Optional(Type.Integer({ minimum: 1 })),
});
export type ListAdditionalFilesQuery = Static<typeof listAdditionalFilesQuerySchema>;
