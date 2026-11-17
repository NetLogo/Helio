import { describe, expect, it } from 'vitest';
import { buildTopicMessages, parseRealtimeMessage } from '#src/shared/realtime/realtime-message.ts';
import type { AnyRealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';

const modelTopic: AnyRealtimeTopic = {
  type: 'model',
  events: ['model_comment.created', 'model_comment.deleted'],
  getTopic: (event) => ({ type: 'model', id: event.resourceId }),
  canSubscribe: async () => true,
};
const userTopic: AnyRealtimeTopic = {
  type: 'user',
  events: ['user_notification.created'],
  getTopic: (event) => ({ type: 'user', id: event.resourceId }),
  canSubscribe: async () => true,
};
const topics = [modelTopic, userTopic];

describe('buildTopicMessages', () => {
  it('builds one message for each topic that declares the event type', () => {
    expect(buildTopicMessages({ type: 'model_comment.deleted', resourceId: 'm1' }, topics)).toEqual(
      [{ topic: { type: 'model', id: 'm1' }, event: 'model_comment.deleted' }],
    );
  });

  it('builds a message per topic when several topics declare the same event type', () => {
    const sharedEvent: AnyRealtimeTopic = {
      type: 'user',
      events: ['user_notification.created'],
      getTopic: () => ({ type: 'user', id: 'owner' }),
      canSubscribe: async () => true,
    };

    expect(
      buildTopicMessages({ type: 'user_notification.created', resourceId: 'u1' }, [
        userTopic,
        sharedEvent,
      ]),
    ).toEqual([
      { topic: { type: 'user', id: 'u1' }, event: 'user_notification.created' },
      { topic: { type: 'user', id: 'owner' }, event: 'user_notification.created' },
    ]);
  });

  it('builds nothing for an event type no topic declares', () => {
    expect(buildTopicMessages({ type: 'model.created', resourceId: 'm1' }, topics)).toEqual([]);
  });
});

describe('parseRealtimeMessage', () => {
  it('reads a message whose topic type is registered and declares the event', () => {
    const payload = '{"topic":{"type":"user","id":"u1"},"event":"user_notification.created"}';

    expect(parseRealtimeMessage(payload, topics)).toEqual({
      topic: { type: 'user', id: 'u1' },
      event: 'user_notification.created',
    });
  });

  it('keeps only the topic type, the topic id and the event', () => {
    const payload = JSON.stringify({
      topic: { type: 'model', id: 'm1', title: 'Secret' },
      event: 'model_comment.created',
      content: 'Hello',
    });

    expect(parseRealtimeMessage(payload, topics)).toEqual({
      topic: { type: 'model', id: 'm1' },
      event: 'model_comment.created',
    });
  });

  it.each([
    ['no payload', undefined],
    ['an empty payload', ''],
    ['a payload that is not JSON', 'm1'],
    ['a JSON value that is not an object', 'null'],
    ['a message without a topic', '{"event":"model_comment.created"}'],
    [
      'an unregistered topic type',
      '{"topic":{"type":"project","id":"p1"},"event":"model_comment.created"}',
    ],
    [
      'a topic id that is not a string',
      '{"topic":{"type":"model","id":1},"event":"model_comment.created"}',
    ],
    [
      'an event the topic type does not declare',
      '{"topic":{"type":"model","id":"m1"},"event":"user_notification.created"}',
    ],
  ])('drops %s', (_, payload) => {
    expect(parseRealtimeMessage(payload, topics)).toBeNull();
  });
});
