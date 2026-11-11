import { idSchema } from '#src/shared/utils/id.ts';
import { Type, type Static } from 'typebox';

export const streamSubscriptionRequestDtoSchema = Type.Object({
  connectionId: idSchema('The id the stream sent in its connection message'),
  topic: Type.Object({
    type: Type.String({
      description: 'A topic type registered by a module, such as model or user',
    }),
    id: idSchema('The id of the resource the topic follows'),
  }),
});

export type StreamSubscriptionRequestDto = Static<typeof streamSubscriptionRequestDtoSchema>;
