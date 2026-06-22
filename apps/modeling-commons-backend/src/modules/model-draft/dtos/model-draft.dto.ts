import { Type, type Static } from 'typebox';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';
import { draftDataV1Schema } from '#src/modules/model-draft/schemas/v1.ts';
import { visibilitySchema } from '#src/modules/model/shared/enums.ts';

export const createDraftRequestDtoSchema = Type.Object({
  modelId: Type.Optional(Type.String({ format: 'uuid' })),
});

export const patchDraftRequestDtoSchema = Type.Partial(
  Type.Object({
    title: Type.String({ minLength: 1, maxLength: 255 }),
    description: Type.String({ maxLength: 10000 }),
    visibility: visibilitySchema,
    tags: Type.Array(Type.String({ minLength: 1, maxLength: 64 }), { maxItems: 100 }),
  }),
);

export const draftIdParamsSchema = Type.Object({
  id: Type.String(),
});

export const draftFileParamsSchema = Type.Object({
  id: Type.String(),
  fileId: Type.String(),
});

export const draftFileRoleSchema = Type.Union([
  Type.Literal('primary'),
  Type.Literal('model-file'),
  Type.Literal('attachment'),
  Type.Literal('preview'),
]);

export const modelDraftResponseDtoSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  modelId: Type.Union([Type.String(), Type.Null()]),
  schemaVersion: Type.Integer(),
  data: draftDataV1Schema,
  previewImageUrl: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const modelDraftPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(modelDraftResponseDtoSchema),
  }),
]);

export const draftFileUploadFieldsSchema = Type.Object({
  role: draftFileRoleSchema,
});

export const draftFileUploadResponseSchema = Type.Object({
  id: Type.Optional(Type.String({ format: 'uuid' })),
  role: draftFileRoleSchema,
  s3Key: Type.String(),
  filename: Type.String(),
  sizeBytes: Type.Integer(),
  mimeType: Type.String(),
  previewImageUrl: Type.Optional(Type.String()),
});

export const generatePreviewImageResponseSchema = Type.Object({
  s3Key: Type.String(),
  filename: Type.String(),
  sizeBytes: Type.Integer({ minimum: 0 }),
  mimeType: Type.String(),
  previewImageUrl: Type.String(),
});

export const publishDraftResponseSchema = Type.Object({
  modelId: Type.String(),
  versionNumber: Type.Integer({ minimum: 1 }),
  createdNewVersion: Type.Boolean(),
});

export type CreateDraftRequestDto = Static<typeof createDraftRequestDtoSchema>;
export type PatchDraftRequestDto = Static<typeof patchDraftRequestDtoSchema>;
export type DraftIdParams = Static<typeof draftIdParamsSchema>;
export type DraftFileParams = Static<typeof draftFileParamsSchema>;
export type DraftFileRole = Static<typeof draftFileRoleSchema>;
export type ModelDraftResponseDto = Static<typeof modelDraftResponseDtoSchema>;
export type DraftFileUploadFieldsDto = Static<typeof draftFileUploadFieldsSchema>;
export type DraftFileUploadResponseDto = Static<typeof draftFileUploadResponseSchema>;
export type PublishDraftResponseDto = Static<typeof publishDraftResponseSchema>;
export type GeneratePreviewImageResponseDto = Static<typeof generatePreviewImageResponseSchema>;
