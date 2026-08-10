import { describe, expect, test } from 'vitest';
import {
  buildFullName,
  hashIp,
  normalizeEmail,
  normalizeTagName,
  pickLowestIdWinners,
  toUtcDateOnly,
} from './normalize.ts';

describe('normalizeEmail', () => {
  test('trims and lowercases', () => {
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com');
  });

  test('maps blank and nullish input to the empty string', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail('   ')).toBe('');
  });
});

describe('normalizeTagName', () => {
  test('trims and lowercases', () => {
    expect(normalizeTagName('  Sexual Reproduction ')).toBe('sexual reproduction');
  });

  test('maps blank and nullish input to the empty string', () => {
    expect(normalizeTagName(null)).toBe('');
    expect(normalizeTagName('  ')).toBe('');
  });
});

describe('buildFullName', () => {
  test('joins both parts with a single space', () => {
    expect(buildFullName('Ada', 'Lovelace')).toBe('Ada Lovelace');
  });

  test('tolerates a missing part', () => {
    expect(buildFullName('Ada', null)).toBe('Ada');
    expect(buildFullName(null, 'Lovelace')).toBe('Lovelace');
  });

  test('trims each part', () => {
    expect(buildFullName('  Ada ', ' Lovelace  ')).toBe('Ada Lovelace');
  });

  test('returns null when nothing is left', () => {
    expect(buildFullName(null, null)).toBeNull();
    expect(buildFullName('  ', '')).toBeNull();
  });
});

describe('toUtcDateOnly', () => {
  test('pins a local-midnight date to UTC midnight of the same calendar day', () => {
    const local = new Date(1815, 11, 10); // what pg returns for a `date` column
    expect(toUtcDateOnly(local)?.toISOString()).toBe('1815-12-10T00:00:00.000Z');
  });

  test('keeps the calendar day whatever the local time of day', () => {
    expect(toUtcDateOnly(new Date(2020, 0, 1, 23, 59, 59))?.toISOString()).toBe(
      '2020-01-01T00:00:00.000Z',
    );
    expect(toUtcDateOnly(new Date(2020, 0, 1, 0, 0, 1))?.toISOString()).toBe(
      '2020-01-01T00:00:00.000Z',
    );
  });

  test('is stable across timezones for the same calendar day', () => {
    expect(toUtcDateOnly(new Date(1990, 5, 15))?.toISOString()).toBe('1990-06-15T00:00:00.000Z');
  });

  test('passes through missing values', () => {
    expect(toUtcDateOnly(null)).toBeNull();
    expect(toUtcDateOnly(undefined)).toBeNull();
  });
});

describe('hashIp', () => {
  test('returns null for a missing ip', () => {
    expect(hashIp(null, 'salt')).toBeNull();
    expect(hashIp('', 'salt')).toBeNull();
  });

  test('is a stable 32-char hex digest', () => {
    const hash = hashIp('203.0.113.7', 'salt');
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hashIp('203.0.113.7', 'salt')).toBe(hash);
  });

  test('changes with the salt, so the raw ip is not recoverable across rotations', () => {
    expect(hashIp('203.0.113.7', 'a')).not.toBe(hashIp('203.0.113.7', 'b'));
  });
});

describe('pickLowestIdWinners', () => {
  const rows = [
    { id: 3, name: 'Alpha' },
    { id: 1, name: 'alpha' },
    { id: 2, name: 'beta' },
    { id: 4, name: '' },
  ];

  test('the lowest id claims each key', () => {
    const winners = pickLowestIdWinners(rows, (r) => r.name.toLowerCase());
    expect(winners.get('alpha')?.id).toBe(1);
    expect(winners.get('beta')?.id).toBe(2);
  });

  test('rows with an empty key are excluded', () => {
    const winners = pickLowestIdWinners(rows, (r) => r.name.toLowerCase());
    expect(winners.has('')).toBe(false);
    expect(winners.size).toBe(2);
  });

  test('does not depend on input ordering', () => {
    const ascending = pickLowestIdWinners(
      [...rows].sort((a, b) => a.id - b.id),
      (r) => r.name.toLowerCase(),
    );
    const descending = pickLowestIdWinners(
      [...rows].sort((a, b) => b.id - a.id),
      (r) => r.name.toLowerCase(),
    );
    expect(ascending.get('alpha')?.id).toBe(descending.get('alpha')?.id);
  });
});
