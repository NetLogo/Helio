import { describe, it, expect } from 'vitest';
import modelDomain from '#src/modules/model/domain/model.domain.ts';
import { ModelAlreadyDeletedError } from '#src/modules/model/domain/model.errors.ts';
import type { ModelEntity } from '#src/modules/model/domain/model.types.ts';

const domain = modelDomain();

function makeModel(overrides: Partial<ModelEntity> = {}): ModelEntity {
  return {
    id: 'model-1',
    latestVersionId: null,
    parentModelId: null,
    parentVersionId: null,
    visibility: 'public',
    isEndorsed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('modelDomain', () => {
  describe('createModel', () => {
    it('creates model with defaults', () => {
      const model = domain.createModel({ title: 'Test' });

      expect(model.id).toBeTypeOf('string');
      expect(model.visibility).toBe('public');
      expect(model.isEndorsed).toBe(false);
      expect(model.deletedAt).toBeNull();
      expect(model.parentModelId).toBeNull();
    });

    it('uses provided visibility', () => {
      const model = domain.createModel({ title: 'Test', visibility: 'private' });
      expect(model.visibility).toBe('private');
    });

    it('sets parent references', () => {
      const model = domain.createModel({
        title: 'Fork',
        parentModelId: 'parent-1',
        parentVersionId: 'pv-1',
      });
      expect(model.parentModelId).toBe('parent-1');
      expect(model.parentVersionId).toBe('pv-1');
    });
  });

  describe('assertNotDeleted', () => {
    it('passes for non-deleted model', () => {
      expect(() => domain.assertNotDeleted(makeModel())).not.toThrow();
    });

    it('throws ModelAlreadyDeletedError for deleted model', () => {
      expect(() => domain.assertNotDeleted(makeModel({ deletedAt: new Date() }))).toThrow(
        ModelAlreadyDeletedError,
      );
    });
  });
});
