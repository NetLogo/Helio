import { describe, expect, it } from 'vitest';
import {
  formatCommentFrame,
  formatEventFrame,
  formatRetryFrame,
} from '#src/shared/realtime/sse-frame.ts';

describe('sse frames', () => {
  it('formats an event with an empty data object and a blank-line terminator', () => {
    expect(formatEventFrame('comments')).toBe('event: comments\ndata: {}\n\n');
  });

  it('formats a comment that EventSource ignores', () => {
    expect(formatCommentFrame('open')).toBe(': open\n\n');
  });

  it('formats the client reconnect delay', () => {
    expect(formatRetryFrame(10000)).toBe('retry: 10000\n\n');
  });
});
