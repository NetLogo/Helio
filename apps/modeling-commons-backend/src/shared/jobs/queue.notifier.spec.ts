import { describe, it, expect, vi } from 'vitest';
import makeQueueNotifier from '#src/shared/jobs/queue.notifier.ts';

describe('queueNotifier', () => {
  it('is a no-op before the processor binds it', async () => {
    const notifier = makeQueueNotifier();

    await expect(notifier.nudge()).resolves.toBeUndefined();
  });

  it('sends through whatever the processor bound', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifier = makeQueueNotifier();

    notifier.bind(send);
    await notifier.nudge();
    await notifier.nudge();

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('propagates a send failure to the caller that owns the logging', async () => {
    const error = new Error('queue unreachable');
    const notifier = makeQueueNotifier();

    notifier.bind(vi.fn().mockRejectedValue(error));

    await expect(notifier.nudge()).rejects.toThrow(error);
  });
});
