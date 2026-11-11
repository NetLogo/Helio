import type { StreamEvent, StreamTopic, StreamTopicType } from '@repo/modeling-commons-shared';

export type PublishedEvent = { type: string; resourceId: string };

export type RealtimeTopic<T extends StreamTopicType> = {
  type: T;
  events: ReadonlyArray<StreamEvent<T>>;
  getTopic: (event: PublishedEvent) => Extract<StreamTopic, { type: T }>;
  canSubscribe: (deps: Dependencies, viewerId: string, id: string) => Promise<boolean>;
};

export type AnyRealtimeTopic = { [T in StreamTopicType]: RealtimeTopic<T> }[StreamTopicType];

export function findRealtimeTopic(
  topics: ReadonlyArray<AnyRealtimeTopic>,
  type: unknown,
): AnyRealtimeTopic | undefined {
  return topics.find((topic) => topic.type === type);
}

export function isTopicEvent(topic: AnyRealtimeTopic, eventType: unknown): boolean {
  return (topic.events as ReadonlyArray<unknown>).includes(eventType);
}

export function listTopicEventTypes(topics: ReadonlyArray<AnyRealtimeTopic>): Array<string> {
  return [...new Set(topics.flatMap((topic) => topic.events))];
}
