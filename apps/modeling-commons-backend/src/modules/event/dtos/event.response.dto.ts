import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const eventResponseDtoSchema = Type.Object({
  id: idSchema(),
  type: Type.String(),
  actorId: Type.String(),
  resourceType: Type.String(),
  resourceId: Type.String(),
  payload: Type.Record(Type.String(), Type.Unknown()),
  createdAt: Type.String({ format: 'date-time' }),
});

export type EventResponseDto = Static<typeof eventResponseDtoSchema>;

export const eventDispatchDtoSchema = Type.Object({
  subscriber: Type.String(),
  state: Type.Union([
    Type.Literal('created'),
    Type.Literal('retry'),
    Type.Literal('active'),
    Type.Literal('completed'),
    Type.Literal('cancelled'),
    Type.Literal('failed'),
    Type.Literal('dead'),
  ]),
  attempts: Type.Union([Type.Integer(), Type.Null()]),
  lastError: Type.Union([Type.String(), Type.Null()]),
});

export const adminEventResponseDtoSchema = Type.Object({
  ...eventResponseDtoSchema.properties,
  dispatch: Type.Array(eventDispatchDtoSchema),
});
