import { Type, type Static } from 'typebox';

export const additionalFileParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  fileId: Type.String({ format: 'uuid' }),
});
export type AdditionalFileParams = Static<typeof additionalFileParamsSchema>;

export const listAdditionalFilesQuerySchema = Type.Object({
  taggedVersionId: Type.Optional(Type.String({ format: 'uuid' })),
});
export type ListAdditionalFilesQuery = Static<typeof listAdditionalFilesQuerySchema>;
