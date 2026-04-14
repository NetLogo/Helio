import { Type, type Static } from 'typebox';

export const additionalFileParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  fileId: Type.String({ format: 'uuid' }),
});
export type AdditionalFileParams = Static<typeof additionalFileParamsSchema>;

export const listAdditionalFilesQuerySchema = Type.Object({
  taggedVersionNumber: Type.Optional(Type.Integer({ minimum: 1 })),
});
export type ListAdditionalFilesQuery = Static<typeof listAdditionalFilesQuerySchema>;
