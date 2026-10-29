import { describe, expect, it } from 'vitest';

import { collectUniqueDefined } from '#src/shared/utils/collections.ts';

describe('collectUniqueDefined', () => {
  it('drops null and undefined', () => {
    expect(collectUniqueDefined(['a', null, 'b', undefined])).toEqual(['a', 'b']);
  });

  it('keeps the first occurrence of each value in order', () => {
    expect(collectUniqueDefined(['b', 'a', 'b', null, 'a', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('keeps falsy values that are defined', () => {
    expect(collectUniqueDefined([0, '', false, 0, null])).toEqual([0, '', false]);
  });

  it('returns an empty array when nothing is defined', () => {
    expect(collectUniqueDefined([null, undefined])).toEqual([]);
  });
});
