import { formatCommentFrame, formatMessageFrame } from '#src/shared/realtime/sse-frame.ts';
import {
  buildTopicKey,
  type StreamControlMessage,
  type StreamMessage,
} from '@repo/modeling-commons-shared';

export type RealtimeStream = {
  userId: string;
  topics: ReadonlySet<string>;
  write: (frame: string) => boolean;
  end: () => void;
};

export type RealtimeBroker = {
  openStream: (stream: RealtimeStream) => (() => void) | null;
  publish: (message: StreamMessage) => void;
  broadcast: (message: StreamControlMessage) => void;
  endAll: () => void;
};

const heartbeatFrame = formatCommentFrame('ping');

export function isStreamAllowed(openStreams: number, maxStreams: number): boolean {
  return openStreams < maxStreams;
}

export function makeRealtimeBroker({
  maxStreamsPerUser,
  heartbeatIntervalMs,
}: {
  maxStreamsPerUser: number;
  heartbeatIntervalMs: number;
}): RealtimeBroker {
  const streams = new Set<RealtimeStream>();
  const streamsByTopic = new Map<string, Set<RealtimeStream>>();
  const streamCountByUser = new Map<string, number>();
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  function startHeartbeat(): void {
    if (heartbeat) return;
    heartbeat = setInterval(() => {
      deliver(streams, heartbeatFrame);
    }, heartbeatIntervalMs);
    heartbeat.unref();
  }

  function stopHeartbeat(): void {
    if (!heartbeat || streams.size > 0) return;
    clearInterval(heartbeat);
    heartbeat = null;
  }

  function attachTopic(stream: RealtimeStream, topic: string): void {
    const subscribers = streamsByTopic.get(topic) ?? new Set<RealtimeStream>();
    subscribers.add(stream);
    streamsByTopic.set(topic, subscribers);
  }

  function detachTopic(stream: RealtimeStream, topic: string): void {
    const subscribers = streamsByTopic.get(topic);
    subscribers?.delete(stream);
    if (subscribers?.size === 0) streamsByTopic.delete(topic);
  }

  function remove(stream: RealtimeStream): void {
    if (!streams.delete(stream)) return;
    for (const topic of stream.topics) detachTopic(stream, topic);
    const remaining = (streamCountByUser.get(stream.userId) ?? 1) - 1;
    if (remaining > 0) streamCountByUser.set(stream.userId, remaining);
    else streamCountByUser.delete(stream.userId);
    stopHeartbeat();
  }

  function deliver(targets: Iterable<RealtimeStream>, frame: string): void {
    for (const stream of [...targets]) {
      if (!stream.write(frame)) remove(stream);
    }
  }

  return {
    openStream(stream) {
      const openStreams = streamCountByUser.get(stream.userId) ?? 0;
      if (!isStreamAllowed(openStreams, maxStreamsPerUser)) return null;
      streams.add(stream);
      streamCountByUser.set(stream.userId, openStreams + 1);
      for (const topic of stream.topics) attachTopic(stream, topic);
      startHeartbeat();
      return () => {
        remove(stream);
      };
    },
    publish(message) {
      deliver(streamsByTopic.get(buildTopicKey(message.topic)) ?? [], formatMessageFrame(message));
    },
    broadcast(message) {
      deliver(streams, formatMessageFrame(message));
    },
    endAll() {
      for (const stream of [...streams]) {
        remove(stream);
        stream.end();
      }
    },
  };
}
