export const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

export function computeStreamLifetimeMs(
  expiresAt: Date,
  now: number,
  maxLifetimeMs: number,
): number {
  const untilExpiry = Math.max(expiresAt.getTime() - now, 0);
  return Math.min(untilExpiry, maxLifetimeMs, MAX_TIMER_DELAY_MS);
}
