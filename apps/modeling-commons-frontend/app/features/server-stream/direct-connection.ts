import { computed, readonly, ref, watch, type Ref } from "vue";
import { cancelSubscription, requestSubscription } from "~/features/server-stream/api";
import { parseStreamMessage } from "~/features/server-stream/mappers";
import {
  classifySubscriptionResponse,
  computeReconnectDelay,
} from "~/features/server-stream/reconnect";
import { serverStreamRules } from "~/features/server-stream/rules";
import {
  createTopicRegistry,
  type TopicSignalHandler,
} from "~/features/server-stream/topic-registry";
import type {
  ServerStreamConnection,
  StreamControlMessage,
  StreamMessage,
  StreamStatus,
  StreamTopic,
} from "~/features/server-stream/types";

export type DirectConnection = ServerStreamConnection & { close: () => void };

type StreamSourceOptions = {
  url: string;
  isWanted: () => boolean;
  onStatus: (status: Exclude<StreamStatus, "open">) => void;
  onMessage: (message: StreamMessage | StreamControlMessage) => void;
};

function createStreamSource({ url, isWanted, onStatus, onMessage }: StreamSourceOptions) {
  let source: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let failedAttempts = 0;

  const close = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    source?.close();
    source = null;
    onStatus("closed");
  };

  const scheduleReconnect = () => {
    close();
    const delay = computeReconnectDelay(failedAttempts, Math.random);
    failedAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (isWanted()) open();
    }, delay);
  };

  const open = () => {
    close();
    const next = new EventSource(url, { withCredentials: true });
    source = next;
    onStatus("connecting");
    next.addEventListener("message", (event) => {
      const message = source === next ? parseStreamMessage(event.data) : null;
      if (!message) return;
      if (message.event === "connection") failedAttempts = 0;
      onMessage(message);
    });
    next.addEventListener("error", () => {
      if (source !== next) return;
      if (next.readyState === EventSource.CLOSED) scheduleReconnect();
      else onStatus("connecting");
    });
  };

  return { open, close };
}

function createRequestQueue(getConnectionId: () => string | null) {
  let tail: Promise<unknown> = Promise.resolve();
  return (send: (connectionId: string) => Promise<unknown>) => {
    const connectionId = getConnectionId();
    if (!connectionId) return;
    tail = tail
      .then(() => (getConnectionId() === connectionId ? send(connectionId) : undefined))
      .catch(() => undefined);
  };
}

export function createDirectConnection({
  url,
  allowed,
}: {
  url: string;
  allowed: Readonly<Ref<boolean>>;
}): DirectConnection {
  const status = ref<StreamStatus>("closed");
  const registry = createTopicRegistry();
  let connectionId: string | null = null;

  const enqueue = createRequestQueue(() => connectionId);
  const sendSubscribe = (topic: StreamTopic, isRetry: boolean) =>
    enqueue(async (id) => {
      const status = await requestSubscription(id, topic).catch(() => null);
      if (connectionId !== id) return;
      const outcome = classifySubscriptionResponse(status);
      if (outcome === "live") registry.notify(topic, "live");
      else if (outcome === "retry" && !isRetry) scheduleRetry(topic, id);
    });
  const scheduleRetry = (topic: StreamTopic, id: string) =>
    setTimeout(() => {
      if (connectionId === id && registry.hasTopic(topic)) sendSubscribe(topic, true);
    }, serverStreamRules.subscriptionRetryMs);
  const sendUnsubscribe = (topic: StreamTopic) => enqueue((id) => cancelSubscription(id, topic));

  const handleMessage = (message: StreamMessage | StreamControlMessage) => {
    if (message.event === "connection") {
      connectionId = message.connectionId;
      status.value = "open";
      registry.listTopics().forEach((topic) => sendSubscribe(topic, false));
    } else if (message.event === "resync") {
      registry.notifyAll("resync");
    } else {
      registry.notify(message.topic, message.event);
    }
  };

  const wanted = computed(() => allowed.value && registry.topicCount.value > 0);
  const source = createStreamSource({
    url,
    isWanted: () => wanted.value,
    onStatus: (next) => {
      connectionId = null;
      status.value = next;
    },
    onMessage: handleMessage,
  });
  watch(wanted, (isWanted) => (isWanted ? source.open() : source.close()), { immediate: true });

  return {
    status: readonly(status),
    subscribe(topic, onChange) {
      const handler = onChange as TopicSignalHandler;
      if (registry.addHandler(topic, handler).isFirst) sendSubscribe(topic, false);
      return () => {
        if (registry.removeHandler(topic, handler).wasLast) sendUnsubscribe(topic);
      };
    },
    close: source.close,
  };
}
