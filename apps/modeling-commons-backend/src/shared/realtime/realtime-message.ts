import {
  findRealtimeTopic,
  isTopicEvent,
  type AnyRealtimeTopic,
  type PublishedEvent,
} from '#src/shared/realtime/realtime-topic.ts';
import { isRecord, parseJson } from '#src/shared/utils/json.ts';
import type { StreamMessage } from '@repo/modeling-commons-shared';

type TopicMessageFields = { topic: { type: unknown; id: unknown }; event: unknown };

function hasTopicMessageFields(value: unknown): value is TopicMessageFields {
  return isRecord(value) && isRecord(value['topic']);
}

export function buildTopicMessages(
  event: PublishedEvent,
  topics: ReadonlyArray<AnyRealtimeTopic>,
): Array<StreamMessage> {
  return topics
    .filter((topic) => isTopicEvent(topic, event.type))
    .map((topic) => ({ topic: topic.getTopic(event), event: event.type }) as StreamMessage);
}

export function parseRealtimeMessage(
  payload: string | undefined,
  topics: ReadonlyArray<AnyRealtimeTopic>,
): StreamMessage | null {
  const value: unknown = payload ? parseJson(payload) : null;
  if (!hasTopicMessageFields(value)) return null;
  const { topic, event } = value;
  const registered = findRealtimeTopic(topics, topic.type);
  if (!registered || typeof topic.id !== 'string' || !isTopicEvent(registered, event)) return null;
  return { topic: { type: registered.type, id: topic.id }, event } as StreamMessage;
}
