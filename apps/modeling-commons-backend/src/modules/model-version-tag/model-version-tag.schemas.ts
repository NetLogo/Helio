import { Type, type Static } from 'typebox';

export const addTagRequestDtoSchema = Type.Object({
  name: Type.String({
    description: 'Tag name to apply',
    minLength: 1,
    maxLength: 100,
  }),
});
export type AddTagRequestDto = Static<typeof addTagRequestDtoSchema>;

export const removeTagParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  tagId: Type.String({ format: 'uuid' }),
});
export type RemoveTagParams = Static<typeof removeTagParamsSchema>;

export const versionTagsParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
});
export type VersionTagsParams = Static<typeof versionTagsParamsSchema>;
