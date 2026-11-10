import { describe, expect, it } from 'vitest';
import realtimeConfig from '#src/config/realtime.ts';
import {
  buildModelTopic,
  buildUserTopic,
  resolveChannelSignal,
} from '#src/shared/realtime/topics.ts';

const { channels, events } = realtimeConfig;

describe('resolveChannelSignal', () => {
  it('maps the model channel to that model topic and the comments event', () => {
    expect(resolveChannelSignal(channels.model, 'm1')).toEqual({
      topic: buildModelTopic('m1'),
      event: events.comments,
    });
  });

  it('maps the user channel to that user topic and the notifications event', () => {
    expect(resolveChannelSignal(channels.user, 'u1')).toEqual({
      topic: buildUserTopic('u1'),
      event: events.notifications,
    });
  });

  it('ignores an unknown channel and an empty payload', () => {
    expect(resolveChannelSignal('other', 'm1')).toBeNull();
    expect(resolveChannelSignal(channels.model, '')).toBeNull();
    expect(resolveChannelSignal(channels.user, undefined)).toBeNull();
  });

  it('keeps model and user topics apart for the same id', () => {
    expect(buildModelTopic('x')).not.toBe(buildUserTopic('x'));
  });
});
