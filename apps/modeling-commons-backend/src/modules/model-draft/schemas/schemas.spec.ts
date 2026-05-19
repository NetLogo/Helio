import { describe, it, expect } from 'vitest';
import {
  assertPublishable,
  emptyDraftData,
  LATEST_DRAFT_SCHEMA_VERSION,
  upcast,
  type DraftData,
} from '#src/modules/model-draft/schemas/index.ts';
import {
  ModelDraftInvalidPayloadError,
  UnknownDraftSchemaVersionError,
} from '#src/modules/model-draft/domain/model-draft.errors.ts';

const validPrimary = {
  s3Key: 'staging/u/d/file.nlogo',
  filename: 'file.nlogo',
  sizeBytes: 10,
  mimeType: 'text/plain',
};

describe('model-draft schemas', () => {
  describe('emptyDraftData', () => {
    it('returns an empty object that satisfies the draft data schema', () => {
      const data = emptyDraftData();
      expect(data).toEqual({});
      expect(() => upcast(data, LATEST_DRAFT_SCHEMA_VERSION)).not.toThrow();
    });
  });

  describe('upcast', () => {
    it('parses a valid v1 payload', () => {
      const input: DraftData = {
        title: 'Hi',
        description: 'desc',
        visibility: 'public',
        tags: ['a', 'b'],
        primaryFile: validPrimary,
      };
      const out = upcast(input, LATEST_DRAFT_SCHEMA_VERSION);
      expect(out.title).toBe('Hi');
      expect(out.primaryFile).toEqual(validPrimary);
    });

    it('throws ModelDraftInvalidPayloadError on a malformed payload', () => {
      expect(() => upcast({ title: 123 }, LATEST_DRAFT_SCHEMA_VERSION)).toThrow(
        ModelDraftInvalidPayloadError,
      );
    });

    it('throws UnknownDraftSchemaVersionError for an unknown version', () => {
      expect(() => upcast({}, 999)).toThrow(UnknownDraftSchemaVersionError);
    });
  });

  describe('assertPublishable', () => {
    it('returns the strict data when required fields are present', () => {
      const data: DraftData = {
        title: 'Publishable',
        visibility: 'public',
        primaryFile: validPrimary,
      };
      const strict = assertPublishable(data);
      expect(strict.title).toBe('Publishable');
      expect(strict.primaryFile).toEqual(validPrimary);
      expect(strict.visibility).toBe('public');
    });

    it('throws when title is missing', () => {
      expect(() =>
        assertPublishable({ visibility: 'public', primaryFile: validPrimary } as DraftData),
      ).toThrow(ModelDraftInvalidPayloadError);
    });

    it('throws when primaryFile is missing', () => {
      expect(() =>
        assertPublishable({ title: 't', visibility: 'public' } as DraftData),
      ).toThrow(ModelDraftInvalidPayloadError);
    });

    it('throws when visibility is missing', () => {
      expect(() =>
        assertPublishable({ title: 't', primaryFile: validPrimary } as DraftData),
      ).toThrow(ModelDraftInvalidPayloadError);
    });
  });
});
