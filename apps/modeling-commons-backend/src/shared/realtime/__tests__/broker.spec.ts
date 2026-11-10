import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isStreamAllowed,
  makeRealtimeBroker,
  type RealtimeStream,
} from '#src/shared/realtime/broker.ts';
import { formatCommentFrame, formatEventFrame } from '#src/shared/realtime/sse-frame.ts';

const heartbeatIntervalMs = 25_000;
const maxStreamsPerUser = 16;

type RecordingStream = RealtimeStream & { frames: Array<string>; ended: boolean; open: boolean };

function makeStream(userId: string, topics: Array<string>): RecordingStream {
  const stream: RecordingStream = {
    userId,
    topics,
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
  return makeRealtimeBroker({ maxStreamsPerUser, heartbeatIntervalMs });
}

describe('isStreamAllowed', () => {
  it('allows streams below the cap and refuses at the cap', () => {
    expect(isStreamAllowed(15, 16)).toBe(true);
    expect(isStreamAllowed(16, 16)).toBe(false);
  });
});

describe('makeRealtimeBroker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delivers a published event only to the streams subscribed to that topic', () => {
    const broker = makeBroker();
    const modelA = makeStream('u1', ['user:u1', 'model:a']);
    const modelB = makeStream('u2', ['user:u2', 'model:b']);
    broker.subscribe(modelA);
    broker.subscribe(modelB);

    broker.publish('model:a', 'comments');

    expect(modelA.frames).toEqual([formatEventFrame('comments')]);
    expect(modelB.frames).toEqual([]);
  });

  it('delivers once to a stream that holds the topic', () => {
    const broker = makeBroker();
    const stream = makeStream('u1', ['user:u1', 'user:u1']);
    broker.subscribe(stream);

    broker.publish('user:u1', 'notifications');

    expect(stream.frames).toEqual([formatEventFrame('notifications')]);
  });

  it('stops delivering after unsubscribe', () => {
    const broker = makeBroker();
    const stream = makeStream('u1', ['model:a']);
    const unsubscribe = broker.subscribe(stream);

    unsubscribe?.();
    broker.publish('model:a', 'comments');

    expect(stream.frames).toEqual([]);
  });

  it('broadcasts to every stream', () => {
    const broker = makeBroker();
    const first = makeStream('u1', ['user:u1']);
    const second = makeStream('u2', ['model:a']);
    broker.subscribe(first);
    broker.subscribe(second);

    broker.broadcast('resync');

    expect(first.frames).toEqual([formatEventFrame('resync')]);
    expect(second.frames).toEqual([formatEventFrame('resync')]);
  });

  it('keeps delivering to the others when one stream fails, and drops the failed one', () => {
    const broker = makeBroker();
    const failing = makeStream('u1', ['model:a']);
    const healthy = makeStream('u2', ['model:a']);
    broker.subscribe(failing);
    broker.subscribe(healthy);
    failing.open = false;

    broker.publish('model:a', 'comments');
    failing.open = true;
    broker.publish('model:a', 'comments');

    expect(healthy.frames).toHaveLength(2);
    expect(failing.frames).toEqual([]);
  });

  it('refuses the 17th stream of one user and frees a slot when one closes', () => {
    const broker = makeBroker();
    const unsubscribes = Array.from({ length: maxStreamsPerUser }, () =>
      broker.subscribe(makeStream('u1', ['user:u1'])),
    );
    expect(unsubscribes.every(Boolean)).toBe(true);

    expect(broker.subscribe(makeStream('u1', ['user:u1']))).toBeNull();
    expect(broker.subscribe(makeStream('u2', ['user:u2']))).not.toBeNull();

    unsubscribes[0]?.();
    expect(broker.subscribe(makeStream('u1', ['user:u1']))).not.toBeNull();
  });

  it('frees the slot of a stream dropped after a failed write', () => {
    const broker = makeBroker();
    const streams = Array.from({ length: maxStreamsPerUser }, () => makeStream('u1', ['user:u1']));
    for (const stream of streams) broker.subscribe(stream);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    streams[0]!.open = false;

    broker.publish('user:u1', 'notifications');

    expect(broker.subscribe(makeStream('u1', ['user:u1']))).not.toBeNull();
  });

  it('pings every stream from one shared timer and stops it with the last stream', () => {
    const broker = makeBroker();
    const first = makeStream('u1', ['user:u1']);
    const second = makeStream('u2', ['user:u2']);
    const unsubscribeFirst = broker.subscribe(first);
    const unsubscribeSecond = broker.subscribe(second);

    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(heartbeatIntervalMs - 1);
    expect(first.frames).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(first.frames).toEqual([formatCommentFrame('ping')]);
    expect(second.frames).toEqual([formatCommentFrame('ping')]);

    unsubscribeFirst?.();
    expect(vi.getTimerCount()).toBe(1);
    unsubscribeSecond?.();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ends every stream and forgets them on endAll', () => {
    const broker = makeBroker();
    const first = makeStream('u1', ['user:u1']);
    const second = makeStream('u1', ['model:a']);
    broker.subscribe(first);
    broker.subscribe(second);

    broker.endAll();
    broker.broadcast('resync');

    expect([first.ended, second.ended]).toEqual([true, true]);
    expect(first.frames).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
