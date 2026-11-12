import { describe, it, expect } from 'vitest';
import { summarizeDispatches } from '#src/modules/event/domain/event-dispatch.ts';

const subscribers = ['first', 'second'].map((queueName) => ({
  queueName,
  deadLetterQueueName: `${queueName}-dead`,
}));

function makeRow(queue: string, state: string, retryCount = 0, output: unknown = null) {
  return { value: 'e1', queue, state, retryCount, output };
}

describe('summarizeDispatches', () => {
  it('reports one entry per subscriber that has a job, in subscriber order', () => {
    const result = summarizeDispatches(
      [makeRow('second', 'completed'), makeRow('first', 'created')],
      subscribers,
    );

    expect(result).toEqual([
      { subscriber: 'first', state: 'created', attempts: 0, lastError: null },
      { subscriber: 'second', state: 'completed', attempts: 1, lastError: null },
    ]);
  });

  it('reports no entry for a subscriber without a job', () => {
    expect(summarizeDispatches([makeRow('first', 'completed')], subscribers)).toEqual([
      { subscriber: 'first', state: 'completed', attempts: 1, lastError: null },
    ]);
    expect(summarizeDispatches([], subscribers)).toEqual([]);
  });

  it('maps a dead-letter copy back to its own subscriber only', () => {
    const result = summarizeDispatches(
      [
        makeRow('first', 'completed'),
        makeRow('second', 'failed', 1, { message: 'boom' }),
        makeRow('second-dead', 'created', 0, { message: 'boom' }),
      ],
      subscribers,
    );

    expect(result).toEqual([
      { subscriber: 'first', state: 'completed', attempts: 1, lastError: null },
      { subscriber: 'second', state: 'dead', attempts: 2, lastError: 'boom' },
    ]);
  });

  it('reports the live error message only, never the stack', () => {
    const [dispatch] = summarizeDispatches(
      [makeRow('first', 'retry', 2, { message: 'boom', stack: 'Error: boom\n at x' })],
      subscribers,
    );

    expect(dispatch).toEqual({
      subscriber: 'first',
      state: 'retry',
      attempts: 3,
      lastError: 'boom',
    });
  });

  it('reports no attempts when only the dead-letter copy is left', () => {
    const [dispatch] = summarizeDispatches(
      [makeRow('first-dead', 'created', 0, { message: 'boom' })],
      subscribers,
    );

    expect(dispatch).toEqual({
      subscriber: 'first',
      state: 'dead',
      attempts: null,
      lastError: 'boom',
    });
  });

  it.each([
    ['created', 0, 0],
    ['created', 2, 2],
    ['active', 0, 1],
    ['active', 2, 3],
    ['completed', 1, 2],
  ])('counts a %s job with retry count %i as %i attempts', (state, retryCount, attempts) => {
    const [dispatch] = summarizeDispatches([makeRow('first', state, retryCount)], subscribers);

    expect(dispatch!.attempts).toBe(attempts);
  });
});
