import { describe, expect, it, vi } from 'vitest';
import { handleFailedDeliveries } from '#src/modules/user-notification/delivery-failures.ts';

const options = { name: 'TestCaller', summary: 'Some deliveries failed' };

function rejected(reason: unknown): PromiseRejectedResult {
  return { status: 'rejected', reason };
}

function fulfilled(value: unknown): PromiseFulfilledResult<unknown> {
  return { status: 'fulfilled', value };
}

describe('handleFailedDeliveries', () => {
  it("logs one entry per rejected result with its group's message", () => {
    const logger = { error: vi.fn() };
    const first = new Error('first');
    const second = new Error('second');
    const third = new Error('third');

    expect(() =>
      handleFailedDeliveries(
        [
          { results: [rejected(first), fulfilled(1), rejected(second)], message: 'group a' },
          { results: [fulfilled(2), rejected(third)], message: 'group b' },
        ],
        logger,
        options,
      ),
    ).toThrow(AggregateError);

    expect(logger.error.mock.calls).toEqual([
      [{ name: 'TestCaller', message: 'group a', error: first }],
      [{ name: 'TestCaller', message: 'group a', error: second }],
      [{ name: 'TestCaller', message: 'group b', error: third }],
    ]);
  });

  it('throws one AggregateError carrying every rejection reason across groups', async () => {
    const first = new Error('first');
    const second = new Error('second');

    const rejection = await Promise.resolve()
      .then(() =>
        handleFailedDeliveries(
          [
            { results: [rejected(first)], message: 'group a' },
            { results: [fulfilled(1), rejected(second)], message: 'group b' },
          ],
          { error: vi.fn() },
          options,
        ),
      )
      .catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(AggregateError);
    expect((rejection as AggregateError).errors).toEqual([first, second]);
    expect((rejection as AggregateError).message).toBe('Some deliveries failed');
  });

  it('returns without logging or throwing when nothing rejected', () => {
    const logger = { error: vi.fn() };

    expect(() =>
      handleFailedDeliveries(
        [
          { results: [fulfilled(1)], message: 'group a' },
          { results: [], message: 'group b' },
        ],
        logger,
        options,
      ),
    ).not.toThrow();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
