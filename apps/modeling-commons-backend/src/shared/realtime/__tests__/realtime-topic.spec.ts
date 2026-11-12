import { describe, expect, it } from 'vitest';
import {
  findRealtimeTopic,
  isTopicEvent,
  type AnyRealtimeTopic,
} from '#src/shared/realtime/realtime-topic.ts';

const modelTopic: AnyRealtimeTopic = {
  type: 'model',
  events: ['model_comment.created', 'model_comment.updated'],
  getTopic: (event) => ({ type: 'model', id: event.resourceId }),
  canSubscribe: async () => true,
};
const userTopic: AnyRealtimeTopic = {
  type: 'user',
  events: ['user_notification.created'],
  getTopic: (event) => ({ type: 'user', id: event.resourceId }),
  canSubscribe: async () => true,
};

describe('findRealtimeTopic', () => {
  it('finds a registered topic by its type and nothing for any other value', () => {
    expect(findRealtimeTopic([modelTopic, userTopic], 'user')).toBe(userTopic);
    expect(findRealtimeTopic([modelTopic], 'user')).toBeUndefined();
    expect(findRealtimeTopic([modelTopic], undefined)).toBeUndefined();
  });
});

describe('isTopicEvent', () => {
  it('accepts only the event types the topic declares', () => {
    expect(isTopicEvent(modelTopic, 'model_comment.updated')).toBe(true);
    expect(isTopicEvent(modelTopic, 'user_notification.created')).toBe(false);
  });
});
