import { describe, expect, it } from 'vitest';

import { computeBackoffDelayMs } from '#src/shared/utils/backoff.ts';

describe('computeBackoffDelayMs', () => {
  it('returns the base delay for the first attempt', () => {
    expect(computeBackoffDelayMs(1000, 0)).toBe(1000);
  });

  it('doubles the delay with each attempt', () => {
    expect([1, 2, 3, 4].map((attempt) => computeBackoffDelayMs(1000, attempt))).toEqual([
      2000, 4000, 8000, 16000,
    ]);
  });

  it('multiplies the base delay by two to the power of the attempt', () => {
    expect(computeBackoffDelayMs(60_000, 3)).toBe(480_000);
  });
});
