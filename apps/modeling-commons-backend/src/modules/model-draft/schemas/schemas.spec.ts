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

  describe('kind and seededFrom round-trip', () => {
    const seededFrom = {
      versionNumber: 1,
      primaryFileS3Key: 'k',
      modelFileS3Keys: ['m'],
      additionalFileS3Keys: ['a'],
      previewImageS3Key: 'p',
    };

    const modelAttachment = {
      id: '11111111-1111-1111-1111-111111111111',
      s3Key: 'staging/u/d/model.nlogo',
      filename: 'model.nlogo',
      sizeBytes: 5,
      mimeType: 'text/plain',
      kind: 'model' as const,
    };

    it('upcast preserves attachment kind and the seededFrom baseline (not stripped by Clean)', () => {
      const input: DraftData = {
        title: 'Hi',
        visibility: 'public',
        primaryFile: validPrimary,
        attachments: [modelAttachment],
        seededFrom,
      };

      const result = upcast(input, LATEST_DRAFT_SCHEMA_VERSION);

      expect(result.attachments?.[0]?.kind).toBe('model');
      expect(result.seededFrom).toEqual(seededFrom);
    });

    it('assertPublishable preserves attachment kind and seededFrom on the strict schema', () => {
      const input: DraftData = {
        title: 'Publishable',
        visibility: 'public',
        primaryFile: validPrimary,
        attachments: [modelAttachment],
        seededFrom,
      };

      const strict = assertPublishable(input);

      expect(strict.attachments?.[0]?.kind).toBe('model');
      expect(strict.seededFrom).toEqual(seededFrom);
    });

    it('upcast leaves kind undefined when an attachment omits it', () => {
      const input: DraftData = {
        title: 'Hi',
        visibility: 'public',
        primaryFile: validPrimary,
        attachments: [
          {
            id: '22222222-2222-2222-2222-222222222222',
            s3Key: 'staging/u/d/extra.csv',
            filename: 'extra.csv',
            sizeBytes: 3,
            mimeType: 'text/csv',
          },
        ],
      };

      const result = upcast(input, LATEST_DRAFT_SCHEMA_VERSION);

      expect(result.attachments?.[0]?.kind).toBeUndefined();
    });
  });
});
