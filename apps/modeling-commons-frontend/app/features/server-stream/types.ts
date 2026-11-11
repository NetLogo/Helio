import type { Ref } from "vue";
import type {
  StreamControlMessage,
  StreamEvent,
  StreamMessage,
  StreamTopic,
  StreamTopicType,
} from "@repo/modeling-commons-shared";

export type { StreamControlMessage, StreamMessage, StreamTopic, StreamTopicType };

export type StreamStatus = "connecting" | "open" | "closed";

export type TopicSignal<T extends StreamTopicType> = StreamEvent<T> | "live" | "resync";

export type TopicHandler<T extends StreamTopicType> = (signal: TopicSignal<T>) => void;

export type ServerStreamConnection = {
  status: Readonly<Ref<StreamStatus>>;
  subscribe<T extends StreamTopicType>(
    topic: Extract<StreamTopic, { type: T }>,
    onChange: TopicHandler<T>,
  ): () => void;
};
