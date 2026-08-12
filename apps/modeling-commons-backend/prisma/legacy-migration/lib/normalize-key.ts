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
 * Known path words (`models`, `versions`, `preview-images`, ...) and date
 * segments never share these exact lengths, so they pass through untouched.
 * Matches are anchored to segment boundaries and exact lengths so a
 * legitimate path component or filename is never mistaken for an id.
 */
const HYPHENATED_HEX_SEGMENT = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const NANOID21_SEGMENT = '[A-Za-z0-9_-]{21}';
const NANOID10_SEGMENT = '[A-Za-z0-9_-]{10}';

const BARE_ID = new RegExp(
  `(^|/)(?:${HYPHENATED_HEX_SEGMENT}|${NANOID21_SEGMENT}|${NANOID10_SEGMENT})(?=/|$)`,
  'gi',
);
const FUSED_ID_PREFIX = new RegExp(`(^|/)${NANOID10_SEGMENT}(?=-)`, 'g');

export function normalizeKey(key: string): string {
  return key.replace(BARE_ID, '$1<id>').replace(FUSED_ID_PREFIX, '$1<id>');
}
