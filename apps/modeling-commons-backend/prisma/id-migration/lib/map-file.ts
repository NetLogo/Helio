/** Entries per yielded chunk. Keeps each string small while avoiding a yield per row. */
const ENTRIES_PER_CHUNK = 1_000;

/**
 * The id map as a stream of JSON fragments, byte-identical to
 * `JSON.stringify(Object.fromEntries(map), null, 2)`.
 *
 * The production map holds ~6.2 million entries and serialises to ~415MB
 * against a V8 maximum string length near 512MB, so building it in one piece
 * is already at ~80% of a hard ceiling and the cutover runs against a larger,
 * fresher dump. Exceeding it throws `RangeError: Invalid string length` from
 * `writeMapFile`, which runs *after* the id swap has committed and after
 * superseded storage objects have been deleted — the worst moment to fail.
 *
 * `map-file.spec.ts` pins the output to `JSON.stringify` so the artifact a
 * human opens is unchanged.
 */
export function* mapJsonChunks(map: ReadonlyMap<string, string>): Generator<string> {
  if (map.size === 0) {
    yield '{}';
    return;
  }

  yield '{\n';

  let buffer = '';
  let entriesInBuffer = 0;
  let first = true;

  for (const [oldId, newId] of map) {
    buffer += `${first ? '' : ',\n'}  ${JSON.stringify(oldId)}: ${JSON.stringify(newId)}`;
    first = false;
    entriesInBuffer += 1;

    if (entriesInBuffer >= ENTRIES_PER_CHUNK) {
      yield buffer;
      buffer = '';
      entriesInBuffer = 0;
    }
  }

  yield `${buffer}\n}`;
}
