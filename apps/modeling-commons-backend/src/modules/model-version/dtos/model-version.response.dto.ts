import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const modelVersionResponseDtoSchema = Type.Object({
  modelId: idSchema(),
  versionNumber: Type.Integer({
    minimum: 1,
    description:
      'The version number, starting at 1 and incrementing by 1 for each new version of a model.',
  }),
  title: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  netlogoFileKey: Type.Union([
    Type.String({ examples: ['/uploads/models/model.nlogo'] }),
    Type.Null(),
  ]),
  netlogoVersion: Type.Union([
    Type.String({
      description: 'The version of NetLogo that the model is compatible with.',
      examples: ['6.2.0'],
    }),
    Type.Null(),
  ]),
  infoTab: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  isFinalized: Type.Boolean(),
});

export type ModelVersionResponseDto = Static<typeof modelVersionResponseDtoSchema>;
