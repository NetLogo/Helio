import { describe, it, expect } from 'vitest';
import { formatUserList } from '#src/shared/utils/formatters.ts';

describe('formatUserList', () => {
  it.each<[Array<string>, number, string]>([
    [[], 1, 'One person'],
    [[], 4, '4 people'],
    [['Alice'], 1, 'Alice'],
    [['Alice'], 2, 'Alice and 1 other'],
    [['Alice'], 4, 'Alice and 3 others'],
    [['Alice', 'Bob'], 2, 'Alice and Bob'],
    [['Alice', 'Bob'], 3, 'Alice, Bob, and 1 other'],
    [['Alice', 'Bob'], 13, 'Alice, Bob, and 11 others'],
  ])('formats %j of %i people as "%s"', (names, total, expected) => {
    expect(formatUserList(names, total)).toBe(expected);
  });

  it('names at most two people and counts the rest', () => {
    expect(formatUserList(['Alice', 'Bob', 'Carol'], 3)).toBe('Alice, Bob, and 1 other');
  });
});
