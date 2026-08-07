import { describe, expect, test } from 'vitest';
import { parseCsv } from './csv.ts';

describe('parseCsv', () => {
  test('parses a plain record', () => {
    expect(parseCsv('side,id,detail\nnew,7921,hello\n')).toEqual([
      ['side', 'id', 'detail'],
      ['new', '7921', 'hello'],
    ]);
  });

  test('parses a final record with no trailing newline', () => {
    expect(parseCsv('new,1,a')).toEqual([['new', '1', 'a']]);
  });

  test('keeps commas inside quoted fields', () => {
    expect(parseCsv('new,1,"a,b,c"')).toEqual([['new', '1', 'a,b,c']]);
  });

  test('unescapes doubled quotes', () => {
    expect(parseCsv('new,1,"{""id"":1}"')).toEqual([['new', '1', '{"id":1}']]);
  });

  test('keeps newlines inside quoted fields as one record', () => {
    const input = 'side,id,detail\nmodified,5674,"line one\n\nline two"\nnew,8545,x\n';
    expect(parseCsv(input)).toEqual([
      ['side', 'id', 'detail'],
      ['modified', '5674', 'line one\n\nline two'],
      ['new', '8545', 'x'],
    ]);
  });

  test('does not split on a newline-looking prefix inside quotes', () => {
    expect(parseCsv('modified,1,"a\nnew,2,b"')).toEqual([['modified', '1', 'a\nnew,2,b']]);
  });

  test('preserves empty fields', () => {
    expect(parseCsv('a,,c\n')).toEqual([['a', '', 'c']]);
  });

  test('preserves a trailing empty field', () => {
    expect(parseCsv('a,b,\n')).toEqual([['a', 'b', '']]);
  });

  test('strips carriage returns', () => {
    expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  test('returns no rows for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });

  test('ignores a trailing blank line', () => {
    expect(parseCsv('a,b\n\n')).toEqual([['a', 'b']]);
  });
});
