import { describe, expect, it } from 'vitest';
import { userNotificationTopic } from '#src/modules/user-notification/realtime/user-notification.topic.ts';

const deps = {} as Dependencies;

describe('userNotificationTopic.canSubscribe', () => {
  it('accepts only the viewer own user id', async () => {
    await expect(userNotificationTopic.canSubscribe(deps, 'u1', 'u1')).resolves.toBe(true);
    await expect(userNotificationTopic.canSubscribe(deps, 'u1', 'u2')).resolves.toBe(false);
  });
});
