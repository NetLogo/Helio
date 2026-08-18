import { describe, it, expect } from 'vitest';
import modelDraftDomain from '#src/modules/model-draft/domain/model-draft.domain.ts';
import { ModelDraftAccessDeniedError } from '#src/modules/model-draft/domain/model-draft.errors.ts';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import { ID_PATTERN } from '#src/shared/utils/id.ts';

const domain = modelDraftDomain();

function makeDraft(overrides: Partial<ModelDraftEntity> = {}): ModelDraftEntity {
  return {
    id: 'draft-1',
    userId: 'user-1',
    modelId: null,
    schemaVersion: 1,
    data: {} as never,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('modelDraftDomain', () => {
  describe('createDraft', () => {
    it('creates a draft with a generated id and timestamps', () => {
      const draft = domain.createDraft({
        userId: 'user-1',
        schemaVersion: 1,
        data: {},
      });

      expect(draft.id).toMatch(new RegExp(ID_PATTERN));
      expect(draft.userId).toBe('user-1');
      expect(draft.modelId).toBeNull();
      expect(draft.schemaVersion).toBe(1);
      expect(draft.createdAt).toBeInstanceOf(Date);
      expect(draft.updatedAt).toBeInstanceOf(Date);
    });

    it('attaches the provided modelId', () => {
      const draft = domain.createDraft({
        userId: 'user-1',
        modelId: 'model-1',
        schemaVersion: 1,
        data: {},
      });
      expect(draft.modelId).toBe('model-1');
    });

    it('preserves the data payload', () => {
      const data = { title: 'hello', visibility: 'public' };
      const draft = domain.createDraft({
        userId: 'user-1',
        schemaVersion: 1,
        data,
      });
      expect(draft.data).toEqual(data);
    });

    it('generates unique ids across drafts', () => {
      const a = domain.createDraft({ userId: 'u', schemaVersion: 1, data: {} });
      const b = domain.createDraft({ userId: 'u', schemaVersion: 1, data: {} });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('assertOwnedBy', () => {
    it('passes when userId matches', () => {
      expect(() => domain.assertOwnedBy(makeDraft({ userId: 'u-1' }), 'u-1')).not.toThrow();
    });

    it('throws ModelDraftAccessDeniedError when userId does not match', () => {
      expect(() => domain.assertOwnedBy(makeDraft({ userId: 'u-1' }), 'u-2')).toThrow(
        ModelDraftAccessDeniedError,
      );
    });
  });
});
