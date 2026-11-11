import { describe, expect, it } from 'vitest';

import { isRecord, parseJson } from '#src/shared/utils/json.ts';

describe('isRecord', () => {
  it.each([{}, { a: 1 }, []])('accepts the object %j', (value) => {
    expect(isRecord(value)).toBe(true);
  });

  it.each([null, undefined, 'text', 1, true])('rejects %j', (value) => {
    expect(isRecord(value)).toBe(false);
  });
});

describe('parseJson', () => {
  it('parses valid JSON', () => {
    expect(parseJson('{"a":[1,null]}')).toEqual({ a: [1, null] });
  });

  it('returns undefined for malformed JSON', () => {
    expect(parseJson('{"a":')).toBeUndefined();
  });
});
