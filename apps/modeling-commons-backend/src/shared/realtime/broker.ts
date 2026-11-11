import { formatCommentFrame, formatMessageFrame } from '#src/shared/realtime/sse-frame.ts';
import {
  buildTopicKey,
  type StreamControlMessage,
  type StreamMessage,
} from '@repo/modeling-commons-shared';

export type RealtimeStream = {
  connectionId: string;
  userId: string;
  write: (frame: string) => boolean;
  end: () => void;
};

export type TopicRequest = { connectionId: string; userId: string; topic: string };

export type RealtimeBroker = {
  openStream: (stream: RealtimeStream) => (() => void) | null;
  addTopic: (request: TopicRequest) => boolean;
  removeTopic: (request: TopicRequest) => boolean;
  publish: (message: StreamMessage) => void;
  broadcast: (message: StreamControlMessage) => void;
  endAll: () => void;
};

const heartbeatFrame = formatCommentFrame('ping');

export function isStreamAllowed(openStreams: number, maxStreams: number): boolean {
  return openStreams < maxStreams;
}

export function isTopicAllowed(
  heldTopics: ReadonlySet<string>,
  topic: string,
  maxTopics: number,
): boolean {
  return heldTopics.has(topic) || heldTopics.size < maxTopics;
}

export function makeRealtimeBroker({
  maxStreamsPerUser,
  maxTopicsPerStream,
  heartbeatIntervalMs,
}: {
  maxStreamsPerUser: number;
  maxTopicsPerStream: number;
  heartbeatIntervalMs: number;
}): RealtimeBroker {
  const streams = new Set<RealtimeStream>();
  const streamsByTopic = new Map<string, Set<RealtimeStream>>();
  const streamCountByUser = new Map<string, number>();
  const streamsByConnectionId = new Map<string, RealtimeStream>();
  const topicsByStream = new Map<RealtimeStream, Set<string>>();
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

  function findOwnedStream({ connectionId, userId }: TopicRequest): RealtimeStream | null {
    const stream = streamsByConnectionId.get(connectionId);
    return stream?.userId === userId ? stream : null;
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
    for (const topic of topicsByStream.get(stream) ?? []) detachTopic(stream, topic);
    topicsByStream.delete(stream);
    streamsByConnectionId.delete(stream.connectionId);
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
      streamsByConnectionId.set(stream.connectionId, stream);
      topicsByStream.set(stream, new Set());
      startHeartbeat();
      return () => {
        remove(stream);
      };
    },
    addTopic(request) {
      const stream = findOwnedStream(request);
      const held = stream && topicsByStream.get(stream);
      if (!stream || !held || !isTopicAllowed(held, request.topic, maxTopicsPerStream)) {
        return false;
      }
      held.add(request.topic);
      attachTopic(stream, request.topic);
      return true;
    },
    removeTopic(request) {
      const stream = findOwnedStream(request);
      if (!stream || !topicsByStream.get(stream)?.delete(request.topic)) return false;
      detachTopic(stream, request.topic);
      return true;
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
