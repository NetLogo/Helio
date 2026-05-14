const counters: Record<string, number> = {};

/**
 * Deterministic UUID-shaped string, auto-incrementing per prefix.
 * Prefix is padded/truncated to 8 chars.
 *
 *   id('user')  => 'user0000-0000-4000-a000-000000000000'
 *   id('user')  => 'user0000-0000-4000-a000-000000000001'
 */
export function id(prefix: string): string {
  const padded = prefix.slice(0, 8).padEnd(8, '0');
  counters[padded] ??= 0;
  const suffix = counters[padded].toString().padStart(12, '0');
  counters[padded]++;
  return `${padded}-0000-4000-a000-${suffix}`;
}
