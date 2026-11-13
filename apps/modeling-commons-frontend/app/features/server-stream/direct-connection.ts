import { buildTopicKey } from "@repo/modeling-commons-shared";
import { computed, readonly, ref, shallowReactive, watch, type Ref } from "vue";
import { parseStreamMessage } from "~/features/server-stream/mappers";
import type {
  ServerStreamConnection,
  StreamControlMessage,
  StreamMessage,
  StreamStatus,
  StreamTopic,
} from "~/features/server-stream/types";

export type DirectConnection = ServerStreamConnection & { close: () => void };

type SignalHandler = (signal: string) => void;

type StreamSourceOptions = {
  onStatus: (status: StreamStatus) => void;
  onMessage: (message: StreamMessage | StreamControlMessage) => void;
};

function createStreamSource({ onStatus, onMessage }: StreamSourceOptions) {
  let source: EventSource | null = null;

  const close = () => {
    source?.close();
    source = null;
    onStatus("closed");
  };

  const open = (url: string) => {
    close();
    const next = new EventSource(url, { withCredentials: true });
    source = next;
    onStatus("connecting");
    next.addEventListener("open", () => {
      if (source === next) onStatus("open");
    });
    next.addEventListener("message", (event) => {
      const message = source === next ? parseStreamMessage(event.data) : null;
      if (message) onMessage(message);
    });
    next.addEventListener("error", () => {
      if (source !== next) return;
      if (next.readyState === EventSource.CLOSED) close();
      else onStatus("connecting");
    });
  };

  return { open, close };
}

export function createDirectConnection({
  url,
  allowed,
}: {
  url: string;
  allowed: Readonly<Ref<boolean>>;
}): DirectConnection {
  const status = ref<StreamStatus>("closed");
  const handlersByTopic = shallowReactive(new Map<string, Set<SignalHandler>>());

  const notify = (key: string, signal: string) => {
    for (const handler of [...(handlersByTopic.get(key) ?? [])]) handler(signal);
  };
  const notifyAll = (signal: string) => {
    for (const key of [...handlersByTopic.keys()]) notify(key, signal);
  };

  const streamUrl = computed(() => {
    if (!allowed.value || handlersByTopic.size === 0) return null;
    const topics = [...handlersByTopic.keys()].sort().join(",");
    return `${url}?topics=${topics}`;
  });

  const source = createStreamSource({
    onStatus: (next) => {
      status.value = next;
      if (next === "open") notifyAll("resync");
    },
    onMessage: (message) => {
      if (message.event === "resync") notifyAll("resync");
      else notify(buildTopicKey(message.topic), message.event);
    },
  });
  watch(streamUrl, (next) => (next ? source.open(next) : source.close()), { immediate: true });

  return {
    status: readonly(status),
    subscribe(topic: StreamTopic, onChange) {
      const key = buildTopicKey(topic);
      const handler = onChange as SignalHandler;
      const handlers = handlersByTopic.get(key) ?? new Set<SignalHandler>();
      handlers.add(handler);
      if (!handlersByTopic.has(key)) handlersByTopic.set(key, handlers);
      return () => {
        if (handlers.delete(handler) && handlers.size === 0) handlersByTopic.delete(key);
      };
    },
    close: source.close,
  };
}
