import { describe, it, expect } from 'vitest';
import modelAuthorDomain from '#src/modules/model-author/domain/model-author.domain.ts';
import { CannotRemoveOwnerError, NotOwnerError } from '#src/modules/model-author/domain/model-author.errors.ts';

const domain = modelAuthorDomain();

describe('modelAuthorDomain', () => {
  describe('createAuthor', () => {
    it('creates author entity', () => {
      const author = domain.createAuthor('model-1', 'user-1', 'owner');

      expect(author.modelId).toBe('model-1');
      expect(author.userId).toBe('user-1');
      expect(author.role).toBe('owner');
    });
  });

  describe('assertIsOwner', () => {
    it('passes for owner', () => {
      expect(() =>
        domain.assertIsOwner({ modelId: 'm1', userId: 'u1', role: 'owner', createdAt: new Date() }),
      ).not.toThrow();
    });

    it('throws for non-owner', () => {
      expect(() =>
        domain.assertIsOwner({ modelId: 'm1', userId: 'u1', role: 'contributor', createdAt: new Date() }),
      ).toThrow(NotOwnerError);
    });
  });

  describe('assertNotOwner', () => {
    it('passes for contributor', () => {
      expect(() =>
        domain.assertNotOwner({ modelId: 'm1', userId: 'u1', role: 'contributor', createdAt: new Date() }),
      ).not.toThrow();
    });

    it('throws for owner', () => {
      expect(() =>
        domain.assertNotOwner({ modelId: 'm1', userId: 'u1', role: 'owner', createdAt: new Date() }),
      ).toThrow(CannotRemoveOwnerError);
    });
  });
});
