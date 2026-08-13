/**
 * Normalises the random segments of a storage key so two dumps of logically
 * identical data diff cleanly, no matter which generator produced the key:
 *   - a bare nanoid(21) or nanoid(10) path segment, as emitted by row ids
 *     and `createStorageKey`
 *   - a `nanoid(10)-filename` fused segment, as emitted by `stagingKey`
 *   - a hyphenated 36-character hex segment: either a legacy pre-migration
 *     row id, or the frozen `storagePathHash` output, which deliberately
 *     keeps that same shape
 *
 * Two restrictions keep real filenames out of this. Ids only ever appear as
 * non-final path segments, so the bare match requires a following slash: a
 * 10- or 21-character extensionless filename is not an id. And the fused
 * prefix only exists in staging keys, so it is only stripped when the path is
 * actually staging-shaped. Without that gate a filename like
 * `wolf-sheep-predation.nlogo` normalises to `<id>-predation.nlogo`, because
 * `wolf-sheep` is ten characters followed by a hyphen.
 */
const HYPHENATED_HEX_SEGMENT = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const NANOID21_SEGMENT = '[A-Za-z0-9_-]{21}';
const NANOID10_SEGMENT = '[A-Za-z0-9_-]{10}';

const BARE_ID = new RegExp(
  `(^|/)(?:${HYPHENATED_HEX_SEGMENT}|${NANOID21_SEGMENT}|${NANOID10_SEGMENT})(?=/)`,
  'gi',
);
const FUSED_ID_PREFIX = new RegExp(`(^|/)${NANOID10_SEGMENT}(?=-)`, 'g');

export function normalizeKey(key: string): string {
  const normalized = key.replace(BARE_ID, '$1<id>');

  const isStagingKey = key.split('/').slice(0, -1).includes('staging');
  return isStagingKey ? normalized.replace(FUSED_ID_PREFIX, '$1<id>') : normalized;
}
