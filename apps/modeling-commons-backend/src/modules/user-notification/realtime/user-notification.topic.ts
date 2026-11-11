import { userNotificationEventTypes } from '#src/modules/event/domain/event-types.ts';
import type { RealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';

export const userNotificationTopic = {
  type: 'user',
  events: [userNotificationEventTypes.created],
  getTopic: (event) => ({ type: 'user', id: event.resourceId }),
  canSubscribe: async (_deps, viewerId, id) => viewerId === id,
} as const satisfies RealtimeTopic<'user'>;
