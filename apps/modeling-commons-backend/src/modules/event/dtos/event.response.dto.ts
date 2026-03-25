import { Type, type Static } from 'typebox';

export const eventResponseDtoSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  type: Type.String(),
  actorId: Type.String(),
  resourceType: Type.String(),
  resourceId: Type.String(),
  payload: Type.Record(Type.String(), Type.Unknown()),
  createdAt: Type.String({ format: 'date-time' }),
  processedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

export type EventResponseDto = Static<typeof eventResponseDtoSchema>;
