import { Type, type Static } from 'typebox';

export const modelVersionTagResponseDtoSchema = Type.Object({
  modelId: Type.String({ format: 'uuid' }),
  versionNumber: Type.Integer(),
  tagId: Type.String({ format: 'uuid' }),
  tagName: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});

export type ModelVersionTagResponseDto = Static<typeof modelVersionTagResponseDtoSchema>;
