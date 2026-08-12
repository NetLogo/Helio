import { createHash } from 'node:crypto';
import { ID_LENGTH } from '#src/shared/utils/id.ts';

const SEED_NAMESPACE = 'modeling-commons:seed';
const NANOID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * Deterministic, NanoID-shaped id derived from a stable natural key.
 *
 * The same parts always produce the same id, so every record can be upserted
 * by id and the whole seed is idempotent across runs - no fragile call-order
 * counters. The natural key is hashed with SHA-256, then each of the first
 * ID_LENGTH digest bytes is mapped into the 64-character NanoID alphabet via
 * `byte & 63`; 64 divides 256 evenly, so the mapping is uniform with no
 * modulo bias.
 *
 *   seedId('user', 'alice')        => '23KwZwy1vmaMPfUEY8US9'
 *   seedId('model', 'wolf-sheep')  => 'UpmQcV8NL5fWuiU_FxxHE'
 */
export function seedId(...parts: Array<string | number>): string {
  const name = `${SEED_NAMESPACE}:${parts.join(':')}`;
  const bytes = createHash('sha256').update(name).digest().subarray(0, ID_LENGTH);

  let id = '';
  for (const byte of bytes) {
    id += NANOID_ALPHABET[byte & 63];
  }
  return id;
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
