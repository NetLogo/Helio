import { createHash } from 'node:crypto';

export function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

export function normalizeTagName(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

export function buildFullName(
  first: string | null | undefined,
  last: string | null | undefined,
): string | null {
  return (
    [first, last]
      .map((s) => (s ?? '').trim())
      .filter(Boolean)
      .join(' ') || null
  );
}

/**
 * node-postgres reads a `date` column as local midnight, while Prisma stores a
 * `@db.Date` field from the Date's UTC calendar day. Left alone, the same
 * birthdate round-trips to a different instant on every read and shifts by a
 * day in positive UTC offsets. Pin it to UTC midnight of the same calendar day.
 */
export function toUtcDateOnly(d: Date | null | undefined): Date | null {
  if (!d) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function hashIp(ip: string | null, salt: string): string | null {
  if (!ip) return null;
  return createHash('sha256')
    .update(salt + ':' + ip)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Lowest legacy id claims a value that is unique in the target schema
 * (User.email, Tag.name). Losers are dropped rather than renamed.
 */
export function pickLowestIdWinners<T extends { id: number }>(
  rows: readonly T[],
  keyOf: (row: T) => string,
): Map<string, T> {
  const winners = new Map<string, T>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const current = winners.get(key);
    if (!current || row.id < current.id) winners.set(key, row);
  }
  return winners;
}
