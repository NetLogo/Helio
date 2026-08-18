import { describe, it, expect } from 'vitest';

import { newId } from '#src/shared/utils/id.ts';

import { normaliseUrl } from '#tests/support/timing-collector.ts';

describe('normaliseUrl', () => {
  it('collapses a NanoID path segment to :id', () => {
    const id = newId();
    expect(normaliseUrl(`/v1/models/${id}`)).toBe('/v1/models/:id');
  });

  it('collapses a legacy dashed identifier path segment to :id', () => {
    expect(normaliseUrl('/v1/models/123e4567-e89b-12d3-a456-426614174000')).toBe('/v1/models/:id');
  });

  it('collapses a numeric path segment to :id', () => {
    expect(normaliseUrl('/v1/models/42')).toBe('/v1/models/:id');
  });

  it('does not collapse ordinary literal segments', () => {
    expect(normaliseUrl('/v1/models/versions/drafts')).toBe('/v1/models/versions/drafts');
  });

  it('does not collapse a NanoID-shaped path with the wrong length', () => {
    expect(normaliseUrl('/v1/models/AAAAAAAAAAAAAAAAAAAA')).toBe('/v1/models/AAAAAAAAAAAAAAAAAAAA');
  });
});
