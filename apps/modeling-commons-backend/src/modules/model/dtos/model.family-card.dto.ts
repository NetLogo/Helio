import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const modelFamilySummarySchema = Type.Object({
  id: idSchema(),
  title: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  visibility: Type.String(),
  isEndorsed: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  latestVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
  parentModelId: Type.Union([idSchema(), Type.Null()]),
  parentVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
  authorName: Type.Union([Type.String(), Type.Null()]),
  versionCount: Type.Integer(),
  linkedVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
});

export type ModelFamilySummary = Static<typeof modelFamilySummarySchema>;

export const modelFamilyCardResponseDtoSchema = Type.Object({
  self: modelFamilySummarySchema,
  parent: Type.Union([modelFamilySummarySchema, Type.Null()]),
  siblings: Type.Array(modelFamilySummarySchema),
  children: Type.Array(modelFamilySummarySchema),
});

export type ModelFamilyCardResponseDto = Static<typeof modelFamilyCardResponseDtoSchema>;
