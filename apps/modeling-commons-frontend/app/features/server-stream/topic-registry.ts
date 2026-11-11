import { buildTopicKey } from "@repo/modeling-commons-shared";
import { computed, shallowReactive } from "vue";
import type { StreamTopic } from "~/features/server-stream/types";

export type TopicSignalHandler = (signal: string) => void;

type TopicEntry = { topic: StreamTopic; handlers: Set<TopicSignalHandler> };

export type TopicRegistry = ReturnType<typeof createTopicRegistry>;

export function createTopicRegistry() {
  const entries = shallowReactive(new Map<string, TopicEntry>());

  const notify = (topic: StreamTopic, signal: string) => {
    const handlers = entries.get(buildTopicKey(topic))?.handlers ?? [];
    for (const handler of [...handlers]) handler(signal);
  };

  return {
    topicCount: computed(() => entries.size),
    addHandler(topic: StreamTopic, handler: TopicSignalHandler): { isFirst: boolean } {
      const key = buildTopicKey(topic);
      const entry = entries.get(key) ?? { topic, handlers: new Set<TopicSignalHandler>() };
      entries.set(key, entry);
      entry.handlers.add(handler);
      return { isFirst: entry.handlers.size === 1 };
    },
    removeHandler(topic: StreamTopic, handler: TopicSignalHandler): { wasLast: boolean } {
      const key = buildTopicKey(topic);
      const entry = entries.get(key);
      if (!entry?.handlers.delete(handler) || entry.handlers.size > 0) return { wasLast: false };
      entries.delete(key);
      return { wasLast: true };
    },
    hasTopic: (topic: StreamTopic) => entries.has(buildTopicKey(topic)),
    listTopics: () => [...entries.values()].map((entry) => entry.topic),
    notify,
    notifyAll(signal: "resync") {
      for (const topic of [...entries.values()].map((entry) => entry.topic)) notify(topic, signal);
    },
  };
}
