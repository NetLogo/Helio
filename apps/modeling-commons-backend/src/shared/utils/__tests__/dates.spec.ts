import { describe, expect, it } from 'vitest';

import { subtractMs } from '#src/shared/utils/dates.ts';

describe('subtractMs', () => {
  it('returns a new date earlier by the given milliseconds', () => {
    const date = new Date('2026-01-01T00:00:10.000Z');

    expect(subtractMs(date, 10_500)).toEqual(new Date('2025-12-31T23:59:59.500Z'));
    expect(date).toEqual(new Date('2026-01-01T00:00:10.000Z'));
  });
});
