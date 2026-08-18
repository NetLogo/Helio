/**
 * Compares two preview image keys ignoring their random nonce segment.
 *
 * Both `buildPreviewFileKey` (legacy migration) and the live app's
 * `createStorageKey` share the same tail convention:
 * `.../{y}/{m}/{d}/{nonce}/{filename}`. The nonce is therefore always the
 * second-to-last path segment, no matter what shape it is: a nanoid(21) from
 * `createModelFromNode`, the frozen `storagePathHash` from the resync, or a
 * nanoid(10) from a live-app edit. Comparing by position rather than by
 * shape means this keeps working as id formats change; what identifies a
 * preview object is its model, date partition and filename, not the nonce.
 */
export function samePreviewObject(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return stripNonce(a) === stripNonce(b);
}

function stripNonce(key: string): string {
  const segments = key.split('/');
  const nonceIndex = segments.length - 2;
  if (nonceIndex < 0) return key;
  segments[nonceIndex] = '<nonce>';
  return segments.join('/');
}
