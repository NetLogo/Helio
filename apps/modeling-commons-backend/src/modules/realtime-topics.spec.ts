import { describe, expect, expectTypeOf, it } from 'vitest';
import workersConfig from '#src/config/workers.ts';
import { realtimeEventTypes, realtimeTopics } from '#src/modules/realtime-topics.ts';
import { buildTopicMessages } from '#src/shared/realtime/realtime-message.ts';
import type { AnyRealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';
import { ID_LENGTH } from '#src/shared/utils/id.ts';

const notifyPayloadLimitBytes = 8000;

describe('realtime topics', () => {
  it('maps a model comment event to the topic of its model', () => {
    expect(
      buildTopicMessages({ type: 'model_comment.updated', resourceId: 'm1' }, realtimeTopics),
    ).toEqual([{ topic: { type: 'model', id: 'm1' }, event: 'model_comment.updated' }]);
  });

  it('maps a created notification event to the topic of its recipient', () => {
    expect(
      buildTopicMessages({ type: 'user_notification.created', resourceId: 'u1' }, realtimeTopics),
    ).toEqual([{ topic: { type: 'user', id: 'u1' }, event: 'user_notification.created' }]);
  });

  it('subscribes the realtime queue to exactly the event types the topics declare', () => {
    expect([...workersConfig.realtime.subscribesTo].sort()).toEqual(
      [
        'model_comment.created',
        'model_comment.deleted',
        'model_comment.updated',
        'user_notification.created',
      ].sort(),
    );
    expect(workersConfig.realtime.subscribesTo).toBe(realtimeEventTypes);
  });

  it('keeps the largest message far under the Postgres NOTIFY payload limit', () => {
    const longestId = 'x'.repeat(ID_LENGTH);
    const payloads = realtimeTopics.flatMap((topic) =>
      topic.events.flatMap((type) =>
        buildTopicMessages({ type, resourceId: longestId }, realtimeTopics),
      ),
    );
    const largest = Math.max(
      ...payloads.map((message) => Buffer.byteLength(JSON.stringify(message))),
    );

    expect(payloads.length).toBeGreaterThan(0);
    expect(largest).toBeLessThan(notifyPayloadLimitBytes);
  });

  it('rejects at type level a topic whose type the shared StreamTopic union does not list', () => {
    const unlisted = {
      type: 'project',
      events: ['project.created'],
      getTopic: (event: { resourceId: string }) => ({ type: 'project', id: event.resourceId }),
    } as const;

    expectTypeOf(realtimeTopics[0]).toExtend<AnyRealtimeTopic>();
    // @ts-expect-error 'project' is not a StreamTopicType, so the registry cannot hold it
    expectTypeOf(unlisted).toExtend<AnyRealtimeTopic>();
  });
});
