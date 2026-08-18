import { describe, expect, it } from 'vitest';
import { mapJsonChunks } from './map-file.ts';

function render(map: Map<string, string>): string {
  return [...mapJsonChunks(map)].join('');
}

function reference(map: Map<string, string>): string {
  return JSON.stringify(Object.fromEntries(map), null, 2);
}

describe('mapJsonChunks', () => {
  it('matches JSON.stringify byte for byte on an empty map', () => {
    const map = new Map<string, string>();
    expect(render(map)).toBe(reference(map));
  });

  it('matches JSON.stringify byte for byte on a single entry', () => {
    const map = new Map([['old', 'new']]);
    expect(render(map)).toBe(reference(map));
  });

  it('matches JSON.stringify byte for byte on many entries', () => {
    const map = new Map(
      Array.from({ length: 2_500 }, (_, i) => [`old-${i}`, `new-${i}`] as const),
    );
    expect(render(map)).toBe(reference(map));
  });

  it('escapes exactly as JSON.stringify does', () => {
    const map = new Map([
      ['quote"key', 'back\\slash'],
      ['new\nline', 'tab\tvalue'],
      ['unicode ', 'emoji😀'],
    ]);
    expect(render(map)).toBe(reference(map));
  });

  it('yields many chunks rather than one string', () => {
    // The point of the generator: the production map serialises to ~415MB,
    // against a V8 maximum string length of ~512MB. Building it in one piece
    // throws RangeError: Invalid string length, and it would throw after the
    // id swap has already committed.
    const map = new Map(
      Array.from({ length: 50_000 }, (_, i) => [`old-${i}`, `new-${i}`] as const),
    );
    const chunks = [...mapJsonChunks(map)];
    expect(chunks.length).toBeGreaterThan(10);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThan(5_000_000);
    }
  });

  it('produces parseable JSON that round-trips the map', () => {
    const map = new Map([
      ['a', '1'],
      ['b', '2'],
      ['c', '3'],
    ]);
    expect(new Map(Object.entries(JSON.parse(render(map)) as Record<string, string>))).toEqual(map);
  });
});
