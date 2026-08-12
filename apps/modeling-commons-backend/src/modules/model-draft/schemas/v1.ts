import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';
import { visibilitySchema } from '#src/modules/model/shared/enums.ts';

export const DRAFT_SCHEMA_VERSION_V1 = 1 as const;

export const modelFileKindSchema = Type.Union([
  Type.Literal('model'),
  Type.Literal('additional'),
]);

export const draftFileV1Schema = Type.Object({
  id: idSchema(),
  s3Key: Type.String(),
  filename: Type.String(),
  sizeBytes: Type.Integer({ minimum: 0 }),
  mimeType: Type.String(),
  kind: Type.Optional(modelFileKindSchema),
});

export const draftPrimaryFileV1Schema = Type.Object({
  s3Key: Type.String(),
  filename: Type.String(),
  sizeBytes: Type.Integer({ minimum: 0 }),
  mimeType: Type.String(),
});

export const draftPreviewImageV1Schema = Type.Object({
  s3Key: Type.String(),
  filename: Type.String(),
  sizeBytes: Type.Integer({ minimum: 0 }),
  mimeType: Type.String(),
});

export const draftSeededFromV1Schema = Type.Object({
  versionNumber: Type.Integer(),
  primaryFileS3Key: Type.String(),
  modelFileS3Keys: Type.Array(Type.String()),
  additionalFileS3Keys: Type.Array(Type.String()),
  previewImageS3Key: Type.Optional(Type.String()),
});

export const draftDataV1Schema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  description: Type.Optional(Type.String({ maxLength: 10000 })),
  visibility: Type.Optional(visibilitySchema),
  tags: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 64 }))),
  primaryFile: Type.Optional(draftPrimaryFileV1Schema),
  previewImage: Type.Optional(draftPreviewImageV1Schema),
  attachments: Type.Optional(Type.Array(draftFileV1Schema)),
  seededFrom: Type.Optional(draftSeededFromV1Schema),
});

export const strictDraftDataV1Schema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String({ maxLength: 10000 })),
  visibility: visibilitySchema,
  tags: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 64 }))),
  primaryFile: draftPrimaryFileV1Schema,
  previewImage: Type.Optional(draftPreviewImageV1Schema),
  attachments: Type.Optional(Type.Array(draftFileV1Schema)),
  seededFrom: Type.Optional(draftSeededFromV1Schema),
});

export type ModelFileKind = Static<typeof modelFileKindSchema>;
export type DraftFileV1 = Static<typeof draftFileV1Schema>;
export type DraftPrimaryFileV1 = Static<typeof draftPrimaryFileV1Schema>;
export type DraftPreviewImageV1 = Static<typeof draftPreviewImageV1Schema>;
export type DraftSeededFromV1 = Static<typeof draftSeededFromV1Schema>;
export type DraftDataV1 = Static<typeof draftDataV1Schema>;
export type StrictDraftDataV1 = Static<typeof strictDraftDataV1Schema>;
