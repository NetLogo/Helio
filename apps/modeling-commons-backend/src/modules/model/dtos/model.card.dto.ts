import { Type, type Static } from 'typebox';
import { modelResponseDtoSchema } from '#src/modules/model/dtos/model.dto.ts';
import { modelVersionResponseDtoSchema } from '#src/modules/model-version/dtos/model-version.response.dto.ts';
import { modelAuthorResponseDtoSchema } from '#src/modules/model-author/dtos/model-author.response.dto.ts';
import { tagResponseDtoSchema } from '#src/modules/tag/dtos/tag.response.dto.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';

export const modelCardAuthorSchema = Type.Intersect([
  modelAuthorResponseDtoSchema,
  Type.Object({
    userName: Type.Union([Type.String(), Type.Null()]),
    userImage: Type.Union([Type.String(), Type.Null()]),
  }),
]);

export const modelCardVersionExtendedResponseDtoSchema = Type.Intersect([
  modelVersionResponseDtoSchema,
  Type.Object({
    netlogoFileDownloadUrl: Type.Union([
      Type.String({
        format: 'uri',
        examples: ['https://modelingcommons.org/files/public/models/model.nlogo'],
      }),
      Type.Null(),
    ]),
    previewImageUrl: Type.Union([
      Type.String({
        format: 'uri',
        examples: ['https://modelingcommons.org/files/public/models/model.png'],
      }),
      Type.Null(),
    ]),
  }),
]);

export const modelCardStatsSchema = Type.Object({
  likes: Type.Integer({ minimum: 0 }),
  views: Type.Integer({ minimum: 0 }),
  runs: Type.Integer({ minimum: 0 }),
  downloads: Type.Integer({ minimum: 0 }),
  shares: Type.Integer({ minimum: 0 }),
  likedByMe: Type.Boolean(),
});

export const modelCardResponseDtoSchema = Type.Object({
  model: modelResponseDtoSchema,
  latestVersion: Type.Union([modelCardVersionExtendedResponseDtoSchema, Type.Null()]),
  authors: Type.Array(modelCardAuthorSchema),
  tagsOnLatestVersion: Type.Array(tagResponseDtoSchema),
  previewImageUrl: Type.Union([Type.String(), Type.Null()]),
  counts: Type.Object({
    versions: Type.Integer(),
    children: Type.Integer(),
  }),
  stats: modelCardStatsSchema,
});

export const modelCardPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(modelCardResponseDtoSchema),
  }),
]);

export type ModelCardResponseDto = Static<typeof modelCardResponseDtoSchema>;
