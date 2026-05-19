import { describe, it, expect } from 'vitest';
import modelLikeDomain from '#src/modules/model-like/domain/model-like.domain.ts';

const domain = modelLikeDomain();

describe('modelLikeDomain', () => {
  describe('createModelLike', () => {
    it('produces an entity with the provided ids and a fresh timestamp', () => {
      const before = Date.now();
      const entity = domain.createModelLike('model-1', 'user-1');
      const after = Date.now();

      expect(entity.modelId).toBe('model-1');
      expect(entity.userId).toBe('user-1');
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(entity.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });
});
