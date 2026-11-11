import { buildTopicKey } from "@repo/modeling-commons-shared";
import type { MaybeRefOrGetter } from "vue";
import type { StreamTopic, StreamTopicType, TopicHandler } from "~/features/server-stream/types";

export function useStreamTopic<T extends StreamTopicType>(
  topic: MaybeRefOrGetter<Extract<StreamTopic, { type: T }> | null>,
  onChange: TopicHandler<T>,
) {
  const connection = useServerStreamConnection();
  const current = computed(() => toValue(topic));
  watch(
    () => (current.value ? buildTopicKey(current.value) : null),
    (_key, _previous, onCleanup) => {
      if (current.value) onCleanup(connection.subscribe(current.value, onChange));
    },
    { immediate: true, flush: "sync" },
  );
  return connection;
}
