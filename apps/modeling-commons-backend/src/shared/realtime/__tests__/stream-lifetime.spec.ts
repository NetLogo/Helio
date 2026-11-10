import { describe, expect, it } from 'vitest';
import {
  computeStreamLifetimeMs,
  MAX_TIMER_DELAY_MS,
} from '#src/shared/realtime/stream-lifetime.ts';

const now = Date.UTC(2026, 10, 9);
const uncapped = Number.POSITIVE_INFINITY;

describe('computeStreamLifetimeMs', () => {
  it('lasts until the session expires when that comes before the cap', () => {
    expect(computeStreamLifetimeMs(new Date(now + 5000), now, 10_000)).toBe(5000);
  });

  it('lasts until the cap when the session outlives it', () => {
    expect(computeStreamLifetimeMs(new Date(now + 60_000), now, 10_000)).toBe(10_000);
  });

  it('ends at once for an already expired session', () => {
    expect(computeStreamLifetimeMs(new Date(now - 5000), now, 10_000)).toBe(0);
  });

  it('never exceeds the largest delay a timer accepts', () => {
    expect(computeStreamLifetimeMs(new Date(now + 40 * 24 * 3600 * 1000), now, uncapped)).toBe(
      MAX_TIMER_DELAY_MS,
    );
  });
});
