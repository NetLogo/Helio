import { describe, expect, test } from 'vitest';
import { ID_PATTERN } from '#src/shared/utils/id.ts';
import { seedId } from './id.ts';

describe('seedId', () => {
  test('is deterministic for the same parts', () => {
    expect(seedId('user', 'alice')).toBe(seedId('user', 'alice'));
    expect(seedId('model', 'wolf-sheep', 1)).toBe(seedId('model', 'wolf-sheep', 1));
  });

  test('matches the NanoID pattern', () => {
    const pattern = new RegExp(ID_PATTERN);
    expect(seedId('user', 'alice')).toMatch(pattern);
    expect(seedId('event', 'model.created', 'abc123')).toMatch(pattern);
  });

  test('produces distinct ids across a large sample of distinct inputs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      ids.add(seedId('key', i));
    }
    expect(ids.size).toBe(10000);
  });
});
