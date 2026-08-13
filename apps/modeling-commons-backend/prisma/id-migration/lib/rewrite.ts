import { ID_PATTERN } from '#src/shared/utils/id.ts';

export type IdMap = ReadonlyMap<string, string>;

const CURRENT_ID = new RegExp(ID_PATTERN);

export function isCurrentId(value: string): boolean {
  return CURRENT_ID.test(value);
}

/**
 * Replaces an old id with its replacement, either as the whole value or as a
 * complete path segment.
 *
 * Segment replacement is what migrates storage keys and the URLs built from
 * them: `avatars/<userId>/2026/08/13/AbCdEfGhIj/pic.png` carries the owner's
 * id as a segment, and so does every `uploads/models/<modelId>/...` key.
 *
 * Matching is by membership in the map, never by shape. A UUID-shaped string
 * that is not a row id is left alone, which is what keeps `storagePathHash`
 * segments (deliberately frozen in UUID shape) out of the rewrite.
 */
export function remapString(value: string, map: IdMap): string {
  const exact = map.get(value);
  if (exact !== undefined) return exact;
  if (!value.includes('/')) return value;

  let changed = false;
  const segments = value.split('/').map((segment) => {
    const mapped = map.get(segment);
    if (mapped === undefined) return segment;
    changed = true;
    return mapped;
  });

  return changed ? segments.join('/') : value;
}

/**
 * Walks a JSON value and remaps every string in it, including object keys.
 * Keys are remapped on exact match only, so a payload keyed by entity id
 * survives without a shape guess going wrong on an ordinary key name.
 */
export function remapJson(value: unknown, map: IdMap): unknown {
  if (typeof value === 'string') return remapString(value, map);
  if (Array.isArray(value)) return value.map((item) => remapJson(item, map));

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [map.get(key) ?? key, remapJson(item, map)]),
    );
  }

  return value;
}
