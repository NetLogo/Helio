import { createHash } from 'node:crypto';

const SEED_NAMESPACE = 'modeling-commons:seed';

/**
 * Deterministic, UUID-shaped id derived from a stable natural key.
 *
 * The same parts always produce the same id, so every record can be upserted
 * by id and the whole seed is idempotent across runs - no fragile call-order
 * counters. Output is a valid v5-style UUID (version + variant bits set).
 *
 *   seedId('user', 'alice')        => 'a1b2...'
 *   seedId('model', 'wolf-sheep')  => 'c3d4...'
 */
export function seedId(...parts: Array<string | number>): string {
  const name = `${SEED_NAMESPACE}:${parts.join(':')}`;
  const bytes = createHash('sha1').update(name).digest().subarray(0, 16);

  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant

  const hex = Buffer.from(bytes).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Tiny deterministic PRNG (mulberry32) seeded from a string. Used to scatter
 * timestamps / pick pools when generating engagement data so the seed produces
 * the same realistic-looking spread on every run.
 */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
