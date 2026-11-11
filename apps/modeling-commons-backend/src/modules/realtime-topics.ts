import { modelCommentTopic } from '#src/modules/model-comment/realtime/model-comment.topic.ts';
import { userNotificationTopic } from '#src/modules/user-notification/realtime/user-notification.topic.ts';
import { listTopicEventTypes, type AnyRealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';

export const realtimeTopics = [
  modelCommentTopic,
  userNotificationTopic,
] as const satisfies ReadonlyArray<AnyRealtimeTopic>;

export const realtimeEventTypes = listTopicEventTypes(realtimeTopics);
