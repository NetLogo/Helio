import { Type, type Static } from 'typebox';
import { modelResponseDtoSchema } from '#src/modules/model/dtos/model.dto.ts';
import { modelVersionResponseDtoSchema } from '#src/modules/model-version/dtos/model-version.response.dto.ts';
import { modelAuthorResponseDtoSchema } from '#src/modules/model-author/dtos/model-author.response.dto.ts';
import { tagResponseDtoSchema } from '#src/modules/tag/dtos/tag.response.dto.ts';

export const modelCardAuthorSchema = Type.Intersect([
  modelAuthorResponseDtoSchema,
  Type.Object({
    userName: Type.Union([Type.String(), Type.Null()]),
    userImage: Type.Union([Type.String(), Type.Null()]),
  }),
]);

export const modelCardResponseDtoSchema = Type.Object({
  model: modelResponseDtoSchema,
  latestVersion: Type.Union([modelVersionResponseDtoSchema, Type.Null()]),
  authors: Type.Array(modelCardAuthorSchema),
  tagsOnLatestVersion: Type.Array(tagResponseDtoSchema),
  counts: Type.Object({
    versions: Type.Integer(),
    children: Type.Integer(),
  }),
});

export type ModelCardResponseDto = Static<typeof modelCardResponseDtoSchema>;
