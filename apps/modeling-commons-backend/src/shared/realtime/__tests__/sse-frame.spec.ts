import { describe, expect, it } from 'vitest';
import {
  formatCommentFrame,
  formatMessageFrame,
  formatRetryFrame,
} from '#src/shared/realtime/sse-frame.ts';

describe('sse frames', () => {
  it('formats a message as one JSON data line with no event name and a blank-line terminator', () => {
    expect(
      formatMessageFrame({ topic: { type: 'model', id: 'm1' }, event: 'model_comment.deleted' }),
    ).toBe('data: {"topic":{"type":"model","id":"m1"},"event":"model_comment.deleted"}\n\n');
  });

  it('formats a control message the same way', () => {
    expect(formatMessageFrame({ event: 'resync' })).toBe('data: {"event":"resync"}\n\n');
  });

  it('formats a comment that EventSource ignores', () => {
    expect(formatCommentFrame('open')).toBe(': open\n\n');
  });

  it('formats the client reconnect delay', () => {
    expect(formatRetryFrame(10000)).toBe('retry: 10000\n\n');
  });
});
