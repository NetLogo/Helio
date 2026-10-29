export function computeBackoffDelayMs(baseMs: number, attempt: number): number {
  return baseMs * 2 ** attempt;
}
