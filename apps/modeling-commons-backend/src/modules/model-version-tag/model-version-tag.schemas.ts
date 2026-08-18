import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const addTagRequestDtoSchema = Type.Object({
  name: Type.String({
    description: 'Tag name to apply',
    minLength: 1,
    maxLength: 100,
  }),
});
export type AddTagRequestDto = Static<typeof addTagRequestDtoSchema>;

export const removeTagParamsSchema = Type.Object({
  id: idSchema(),
  tagId: idSchema(),
});
export type RemoveTagParams = Static<typeof removeTagParamsSchema>;

export const versionTagsParamsSchema = Type.Object({
  id: idSchema(),
  version: Type.Integer({ minimum: 1 }),
});
export type VersionTagsParams = Static<typeof versionTagsParamsSchema>;
