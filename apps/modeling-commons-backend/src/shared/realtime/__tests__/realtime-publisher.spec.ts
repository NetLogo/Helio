import { describe, expect, it, vi } from 'vitest';
import realtimeConfig from '#src/config/realtime.ts';
import { realtimeTopics } from '#src/modules/realtime-topics.ts';
import { notifyRealtime } from '#src/shared/realtime/realtime-publisher.ts';

describe('notifyRealtime', () => {
  it('sends every topic message of the events in one pg_notify statement', async () => {
    const client = { $executeRaw: vi.fn().mockResolvedValue(0) };

    await notifyRealtime(
      client as never,
      [
        { type: 'model_comment.deleted', resourceId: 'm1' },
        { type: 'user_notification.created', resourceId: 'u1' },
      ],
      realtimeTopics,
    );

    expect(client.$executeRaw).toHaveBeenCalledOnce();
    const [strings, channel, payloads] = client.$executeRaw.mock.calls[0] ?? [];
    expect((strings as TemplateStringsArray).join('?')).toContain('pg_notify(?, payload)');
    expect(channel).toBe(realtimeConfig.channel);
    expect(payloads).toEqual([
      '{"topic":{"type":"model","id":"m1"},"event":"model_comment.deleted"}',
      '{"topic":{"type":"user","id":"u1"},"event":"user_notification.created"}',
    ]);
  });

  it('sends nothing when no event maps to a topic', async () => {
    const client = { $executeRaw: vi.fn() };

    await notifyRealtime(
      client as never,
      [{ type: 'model.liked', resourceId: 'm1' }],
      realtimeTopics,
    );

    expect(client.$executeRaw).not.toHaveBeenCalled();
  });
});
