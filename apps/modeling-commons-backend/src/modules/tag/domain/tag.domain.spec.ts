import { describe, it, expect } from 'vitest';
import tagDomain from '#src/modules/tag/domain/tag.domain.ts';
import { InvalidTagNameError } from '#src/modules/tag/domain/tag.errors.ts';
import { ID_PATTERN } from '#src/shared/utils/id.ts';

const domain = tagDomain();

describe('tagDomain', () => {
  describe('validateName', () => {
    it('trims and returns valid name', () => {
      expect(domain.validateName('  ecology  ')).toBe('ecology');
    });

    it('throws for empty name', () => {
      expect(() => domain.validateName('   ')).toThrow(InvalidTagNameError);
    });

    it('throws for special characters', () => {
      expect(() => domain.validateName('tag@!')).toThrow(InvalidTagNameError);
    });

    it('accepts hyphens and spaces', () => {
      expect(domain.validateName('agent-based modeling')).toBe('agent-based modeling');
    });
  });

  describe('createTag', () => {
    it('creates tag entity', () => {
      const tag = domain.createTag({ name: 'ecology' });

      expect(tag.id).toMatch(new RegExp(ID_PATTERN));
      expect(tag.name).toBe('ecology');
    });
  });
});
