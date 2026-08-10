import { describe, expect, test } from 'vitest';
import {
  buildAttachmentFileKey,
  derivedUuid,
  buildAvatarFileKey,
  buildPreviewFileKey,
  buildVersionFileKey,
  getAccessPrefix,
  sanitizeFilename,
} from './file-keys.ts';

const MODEL = '11111111-1111-4111-8111-111111111111';
const FILE = '22222222-2222-4222-8222-222222222222';
const DATE = new Date('2011-02-18T23:30:00.000Z');

describe('sanitizeFilename', () => {
  test.each(['file.txt', 'my model.nlogo', 'Coffee Farm Model.png'])('preserves %j', (input) => {
    expect(sanitizeFilename(input)).toBe(input);
  });

  test('replaces path separators so a filename cannot escape its prefix', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(sanitizeFilename('a\\b')).toBe('a_b');
  });

  test('strips control characters', () => {
    const control = [0x00, 0x1f, 0x7f].map((c) => String.fromCharCode(c));
    expect(sanitizeFilename(`a${control[0]}b${control[1]}c${control[2]}`)).toBe('abc');
  });

  test('trims surrounding whitespace', () => {
    expect(sanitizeFilename('  model.nlogo  ')).toBe('model.nlogo');
  });

  test('falls back to "file" when nothing survives', () => {
    expect(sanitizeFilename('   ')).toBe('file');
    expect(sanitizeFilename('')).toBe('file');
  });
});

describe('derivedUuid', () => {
  test('is stable for the same namespace and id', () => {
    expect(derivedUuid('preview', 4986)).toBe(derivedUuid('preview', 4986));
  });

  test('differs by id and by namespace', () => {
    expect(derivedUuid('preview', 4986)).not.toBe(derivedUuid('preview', 4987));
    expect(derivedUuid('preview', 4986)).not.toBe(derivedUuid('attachment', 4986));
  });

  test('is a well-formed v4-shaped uuid', () => {
    expect(derivedUuid('preview', 1)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test('holds the shape across many ids', () => {
    for (let i = 0; i < 200; i++) {
      expect(derivedUuid('preview', i)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });
});

describe('getAccessPrefix', () => {
  test('public-read is served from the public prefix', () => {
    expect(getAccessPrefix('public-read')).toBe('files/public/uploads');
  });

  test('private uses the bare uploads prefix', () => {
    expect(getAccessPrefix('private')).toBe('uploads');
  });
});

describe('key builders', () => {
  test('version keys are private by default and date-partitioned in UTC', () => {
    expect(buildVersionFileKey(MODEL, DATE, FILE, 'wolf sheep.nlogo')).toBe(
      `uploads/models/${MODEL}/versions/2011/02/18/${FILE}/wolf sheep.nlogo`,
    );
  });

  test('version keys honour an explicit access policy', () => {
    expect(buildVersionFileKey(MODEL, DATE, FILE, 'a.nlogo', 'public-read')).toBe(
      `files/public/uploads/models/${MODEL}/versions/2011/02/18/${FILE}/a.nlogo`,
    );
  });

  test('preview keys are public-read', () => {
    expect(buildPreviewFileKey(MODEL, DATE, FILE, 'p.png')).toBe(
      `files/public/uploads/models/${MODEL}/preview-images/2011/02/18/${FILE}/p.png`,
    );
  });

  test('attachment keys are private', () => {
    expect(buildAttachmentFileKey(MODEL, DATE, FILE, 'CTRNN.nls')).toBe(
      `uploads/models/${MODEL}/additionalFiles/2011/02/18/${FILE}/CTRNN.nls`,
    );
  });

  test('avatar keys are public-read and keyed by user uuid', () => {
    expect(buildAvatarFileKey(MODEL, DATE, FILE, 'avatar')).toBe(
      `files/public/uploads/avatars/${MODEL}/2011/02/18/${FILE}/avatar`,
    );
  });

  test('all builders default the filename and sanitize it', () => {
    expect(buildVersionFileKey(MODEL, DATE, FILE)).toMatch(/\/file$/);
    expect(buildAttachmentFileKey(MODEL, DATE, FILE, 'a/b')).toMatch(/\/a_b$/);
  });

  test('partitions by UTC, not local time', () => {
    const newYearUtc = new Date('2020-01-01T00:30:00.000Z');
    expect(buildVersionFileKey(MODEL, newYearUtc, FILE)).toContain('/2020/01/01/');
  });
});
