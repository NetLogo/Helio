import { formatCommentFrame, formatEventFrame } from '#src/shared/realtime/sse-frame.ts';

export type RealtimeStream = {
  userId: string;
  topics: ReadonlyArray<string>;
  write: (frame: string) => boolean;
  end: () => void;
};

export type RealtimeBroker = {
  subscribe: (stream: RealtimeStream) => (() => void) | null;
  publish: (topic: string, event: string) => void;
  broadcast: (event: string) => void;
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

  function remove(stream: RealtimeStream): void {
    if (!streams.delete(stream)) return;
    for (const topic of stream.topics) {
      const subscribers = streamsByTopic.get(topic);
      subscribers?.delete(stream);
      if (subscribers?.size === 0) streamsByTopic.delete(topic);
    }
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
    subscribe(stream) {
      const openStreams = streamCountByUser.get(stream.userId) ?? 0;
      if (!isStreamAllowed(openStreams, maxStreamsPerUser)) return null;
      streams.add(stream);
      streamCountByUser.set(stream.userId, openStreams + 1);
      for (const topic of new Set(stream.topics)) {
        const subscribers = streamsByTopic.get(topic) ?? new Set<RealtimeStream>();
        subscribers.add(stream);
        streamsByTopic.set(topic, subscribers);
      }
      startHeartbeat();
      return () => {
        remove(stream);
      };
    },
    publish(topic, event) {
      deliver(streamsByTopic.get(topic) ?? [], formatEventFrame(event));
    },
    broadcast(event) {
      deliver(streams, formatEventFrame(event));
    },
    endAll() {
      for (const stream of [...streams]) {
        remove(stream);
        stream.end();
      }
    },
  };
}
