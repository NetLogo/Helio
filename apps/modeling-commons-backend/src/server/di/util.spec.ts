import { describe, it, expect } from 'vitest';
import { formatName } from '#src/server/di/util.ts';

describe('Awilix: formatName()', () => {
  it('should convert hyphenated and dotted file names to camelCase', () => {
    expect(formatName('user-test.repository')).toBe('userTestRepository');
  });

  it('should convert dotted file names to camelCase', () => {
    expect(formatName('user.repository')).toBe('userRepository');
  });

  it('should handle mapper file names', () => {
    expect(formatName('user.mapper')).toBe('userMapper');
  });
});
