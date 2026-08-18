import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const modelVersionTagResponseDtoSchema = Type.Object({
  modelId: idSchema(),
  versionNumber: Type.Integer(),
  tagId: idSchema(),
  tagName: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});

export type ModelVersionTagResponseDto = Static<typeof modelVersionTagResponseDtoSchema>;
