import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isStreamAllowed,
  isTopicAllowed,
  makeRealtimeBroker,
  type RealtimeBroker,
  type RealtimeStream,
} from '#src/shared/realtime/broker.ts';
import { formatCommentFrame } from '#src/shared/realtime/sse-frame.ts';
import type { StreamMessage } from '@repo/modeling-commons-shared';

const heartbeatIntervalMs = 25_000;
const maxStreamsPerUser = 16;
const maxTopicsPerStream = 16;
const commentOnA: StreamMessage = {
  topic: { type: 'model', id: 'a' },
  event: 'model_comment.created',
};
const commentOnB: StreamMessage = {
  topic: { type: 'model', id: 'b' },
  event: 'model_comment.created',
};
const notificationForU1: StreamMessage = {
  topic: { type: 'user', id: 'u1' },
  event: 'user_notification.created',
};

type RecordingStream = RealtimeStream & { frames: Array<string>; ended: boolean; open: boolean };

let nextConnection = 0;

function makeStream(userId: string): RecordingStream {
  nextConnection += 1;
  const stream: RecordingStream = {
    connectionId: `c${nextConnection}`,
    userId,
    frames: [],
    ended: false,
    open: true,
    write: (frame) => {
      if (!stream.open) return false;
      stream.frames.push(frame);
      return true;
    },
    end: () => {
      stream.ended = true;
    },
  };
  return stream;
}

function makeBroker() {
  return makeRealtimeBroker({ maxStreamsPerUser, maxTopicsPerStream, heartbeatIntervalMs });
}

function openWithTopics(broker: RealtimeBroker, userId: string, topics: Array<string>) {
  const stream = makeStream(userId);
  const close = broker.openStream(stream);
  for (const topic of topics) {
    broker.addTopic({ connectionId: stream.connectionId, userId, topic });
  }
  return { stream, close };
}

describe('isStreamAllowed', () => {
  it('allows streams below the cap and refuses at the cap', () => {
    expect(isStreamAllowed(15, 16)).toBe(true);
    expect(isStreamAllowed(16, 16)).toBe(false);
  });
});

describe('isTopicAllowed', () => {
  it('allows a new topic below the cap, refuses one at the cap, and always allows a held one', () => {
    expect(isTopicAllowed(new Set(['model:a']), 'model:b', 2)).toBe(true);
    expect(isTopicAllowed(new Set(['model:a', 'model:b']), 'model:c', 2)).toBe(false);
    expect(isTopicAllowed(new Set(['model:a', 'model:b']), 'model:a', 2)).toBe(true);
  });
});

describe('makeRealtimeBroker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delivers a published message as one data line only to the streams holding its topic key', () => {
    const broker = makeBroker();
    const { stream: modelA } = openWithTopics(broker, 'u1', ['user:u1', 'model:a']);
    const { stream: modelB } = openWithTopics(broker, 'u2', ['user:u2', 'model:b']);

    broker.publish(commentOnA);

    expect(modelA.frames).toEqual([
      'data: {"topic":{"type":"model","id":"a"},"event":"model_comment.created"}\n\n',
    ]);
    expect(modelB.frames).toEqual([]);
  });

  it('delivers nothing to a stream until its topic is added', () => {
    const broker = makeBroker();
    const { stream } = openWithTopics(broker, 'u1', []);

    broker.publish(commentOnA);
    expect(stream.frames).toEqual([]);

    broker.addTopic({ connectionId: stream.connectionId, userId: 'u1', topic: 'model:a' });
    broker.publish(commentOnA);
    expect(stream.frames).toHaveLength(1);
  });

  it('keeps one subscription when a topic is added twice', () => {
    const broker = makeBroker();
    const { stream } = openWithTopics(broker, 'u1', ['user:u1', 'user:u1']);

    broker.publish(notificationForU1);

    expect(stream.frames).toHaveLength(1);
  });

  it('adds nothing for an unknown connection id or a connection of another user', () => {
    const broker = makeBroker();
    const { stream } = openWithTopics(broker, 'u1', []);

    expect(broker.addTopic({ connectionId: 'unknown', userId: 'u1', topic: 'model:a' })).toBe(
      false,
    );
    expect(
      broker.addTopic({ connectionId: stream.connectionId, userId: 'u2', topic: 'model:a' }),
    ).toBe(false);
    broker.publish(commentOnA);

    expect(stream.frames).toEqual([]);
  });

  it('refuses a topic past the per-stream cap and still accepts a held one', () => {
    const broker = makeBroker();
    const held = Array.from({ length: maxTopicsPerStream }, (_, index) => `model:${index}`);
    const { stream } = openWithTopics(broker, 'u1', held);
    const request = { connectionId: stream.connectionId, userId: 'u1' };

    expect(broker.addTopic({ ...request, topic: 'model:a' })).toBe(false);
    expect(broker.addTopic({ ...request, topic: 'model:0' })).toBe(true);
    broker.publish(commentOnA);

    expect(stream.frames).toEqual([]);
  });

  it('removes one topic and keeps delivering the others', () => {
    const broker = makeBroker();
    const { stream } = openWithTopics(broker, 'u1', ['model:a', 'model:b']);

    expect(
      broker.removeTopic({ connectionId: stream.connectionId, userId: 'u1', topic: 'model:a' }),
    ).toBe(true);
    broker.publish(commentOnA);
    broker.publish(commentOnB);

    expect(stream.frames).toHaveLength(1);
    expect(stream.frames[0]).toContain('"id":"b"');
  });

  it('removes nothing for a connection of another user or a topic the stream does not hold', () => {
    const broker = makeBroker();
    const { stream } = openWithTopics(broker, 'u1', ['model:a']);

    expect(
      broker.removeTopic({ connectionId: stream.connectionId, userId: 'u2', topic: 'model:a' }),
    ).toBe(false);
    expect(
      broker.removeTopic({ connectionId: stream.connectionId, userId: 'u1', topic: 'model:b' }),
    ).toBe(false);
    broker.publish(commentOnA);

    expect(stream.frames).toHaveLength(1);
  });

  it('forgets the topics and the connection id of a closed stream', () => {
    const broker = makeBroker();
    const { stream, close } = openWithTopics(broker, 'u1', ['model:a']);

    close?.();
    broker.publish(commentOnA);

    expect(stream.frames).toEqual([]);
    expect(
      broker.addTopic({ connectionId: stream.connectionId, userId: 'u1', topic: 'model:a' }),
    ).toBe(false);
  });

  it('broadcasts to every stream', () => {
    const broker = makeBroker();
    const { stream: first } = openWithTopics(broker, 'u1', ['user:u1']);
    const { stream: second } = openWithTopics(broker, 'u2', []);

    broker.broadcast({ event: 'resync' });

    expect(first.frames).toEqual(['data: {"event":"resync"}\n\n']);
    expect(second.frames).toEqual(['data: {"event":"resync"}\n\n']);
  });

  it('keeps delivering to the others when one stream fails, and drops the failed one', () => {
    const broker = makeBroker();
    const { stream: failing } = openWithTopics(broker, 'u1', ['model:a']);
    const { stream: healthy } = openWithTopics(broker, 'u2', ['model:a']);
    failing.open = false;

    broker.publish(commentOnA);
    failing.open = true;
    broker.publish(commentOnA);

    expect(healthy.frames).toHaveLength(2);
    expect(failing.frames).toEqual([]);
  });

  it('refuses the 17th stream of one user and frees a slot when one closes', () => {
    const broker = makeBroker();
    const closes = Array.from({ length: maxStreamsPerUser }, () =>
      broker.openStream(makeStream('u1')),
    );
    expect(closes.every(Boolean)).toBe(true);

    expect(broker.openStream(makeStream('u1'))).toBeNull();
    expect(broker.openStream(makeStream('u2'))).not.toBeNull();

    closes[0]?.();
    expect(broker.openStream(makeStream('u1'))).not.toBeNull();
  });

  it('frees the slot of a stream dropped after a failed write', () => {
    const broker = makeBroker();
    const streams = Array.from(
      { length: maxStreamsPerUser },
      () => openWithTopics(broker, 'u1', ['user:u1']).stream,
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    streams[0]!.open = false;

    broker.publish(notificationForU1);

    expect(broker.openStream(makeStream('u1'))).not.toBeNull();
  });

  it('pings every stream from one shared timer and stops it with the last stream', () => {
    const broker = makeBroker();
    const first = makeStream('u1');
    const second = makeStream('u2');
    const closeFirst = broker.openStream(first);
    const closeSecond = broker.openStream(second);

    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(heartbeatIntervalMs - 1);
    expect(first.frames).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(first.frames).toEqual([formatCommentFrame('ping')]);
    expect(second.frames).toEqual([formatCommentFrame('ping')]);

    closeFirst?.();
    expect(vi.getTimerCount()).toBe(1);
    closeSecond?.();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ends every stream and forgets them on endAll', () => {
    const broker = makeBroker();
    const { stream: first } = openWithTopics(broker, 'u1', ['user:u1']);
    const { stream: second } = openWithTopics(broker, 'u1', ['model:a']);

    broker.endAll();
    broker.broadcast({ event: 'resync' });

    expect([first.ended, second.ended]).toEqual([true, true]);
    expect(first.frames).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
