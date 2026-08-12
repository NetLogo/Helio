import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createStorageKey, sanitizeFilename } from './utils.ts';

describe('sanitizeFilename', () => {
  describe('preserves already-safe filenames', () => {
    test.each(['file.txt', 'my-file.png', 'my_file.png', 'a.b.c.tar.gz', 'ABC_xyz-123'])(
      'preserves %j',
      (input) => {
        expect(sanitizeFilename(input)).toBe(input);
      },
    );
  });

  describe('replaces invalid characters', () => {
    test.each([
      ['my model.png', 'my_model.png'],
      ['wolf & sheep predation.nlogox', 'wolf___sheep_predation.nlogox'],
      ['hello world.txt', 'hello_world.txt'],
      ['tab\tname', 'tab_name'],
      ['line\nbreak', 'line_break'],
      ['a/b\\c:d*e?f"g<h>i|j', 'a_b_c_d_e_f_g_h_i_j'],
      ['.gitignore', '_gitignore'],
    ])('sanitizes %j', (input, expected) => {
      expect(sanitizeFilename(input)).toBe(expected);
    });
  });

  describe('security-oriented invariants', () => {
    test.each([
      '../secret.txt',
      '../../etc/passwd',
      '..\\..\\windows\\system32',
      '/absolute/path.txt',
      'C:\\Windows\\System32\\drivers\\etc\\hosts',
      '~/../../.ssh/id_rsa',
      '..%2f..%2fetc%2fpasswd',
      'file.php%00.jpg',
      'shell.php\x00.png',
      '\x1b[31mred.txt',
      '..\n..\npasswd',
      '..\r\n..\r\npasswd',
    ])('removes path separators and disallowed chars for %j', (input) => {
      const output = sanitizeFilename(input);

      expect(output).toMatch(/^[a-zA-Z0-9._-]*$/);
      expect(output).not.toContain('/');
      expect(output).not.toContain('\\');
      expect(output).not.toContain('\0');
    });

    test.each(['.gitignore', '../secret.txt', '../../etc/passwd', '...env'])(
      'does not start with a dot for %j',
      (input) => {
        expect(sanitizeFilename(input)).not.toMatch(/^\./);
      },
    );

    test('sanitizes Windows drive-prefixed path', () => {
      expect(sanitizeFilename('C:\\temp\\file.txt')).not.toContain('\\');
    });
  });

  describe('edge cases', () => {
    test('returns empty string for empty input', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    test('replaces invalid characters one-for-one', () => {
      expect(sanitizeFilename('a b$c')).toBe('a_b_c');
    });

    test('does not collapse repeated invalid characters', () => {
      expect(sanitizeFilename('a   b')).toBe('a___b');
    });
  });
});

describe('createStorageKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T12:34:56.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('includes normalized path, UTC date segments, id prefix, and sanitized filename', () => {
    const key = createStorageKey('my model.png', 'uploads/models');

    expect(key).toMatch(/^uploads\/models\/2026\/04\/17\/[A-Za-z0-9_-]{10}\/my_model\.png$/);
  });

  test('normalizes leading and trailing slashes in path', () => {
    const key1 = createStorageKey('file.txt', '/uploads/models/');
    const key2 = createStorageKey('file.txt', '///uploads/models///');

    expect(key1).toMatch(/^uploads\/models\/2026\/04\/17\/[A-Za-z0-9_-]{10}\/file\.txt$/);
    expect(key2).toMatch(/^uploads\/models\/2026\/04\/17\/[A-Za-z0-9_-]{10}\/file\.txt$/);
    expect(key1).not.toContain('//');
    expect(key2).not.toContain('//');
  });

  test('omits the leading path segment when path is empty', () => {
    const key = createStorageKey('file.txt', '');

    expect(key).toMatch(/^2026\/04\/17\/[A-Za-z0-9_-]{10}\/file\.txt$/);
  });

  test('sanitizes the filename portion', () => {
    const key = createStorageKey('../../etc/passwd', 'uploads');

    expect(key).toMatch(/^uploads\/2026\/04\/17\/[A-Za-z0-9_-]{10}\//);

    const filenamePart = key.replace(/^uploads\/2026\/04\/17\/[A-Za-z0-9_-]{10}\//, '');
    expect(filenamePart).toBe('__.._etc_passwd');
    expect(filenamePart).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  test('produces different keys across calls in normal operation', () => {
    const first = createStorageKey('file.txt', 'uploads');
    const second = createStorageKey('file.txt', 'uploads');

    expect(first).not.toBe(second);
  });

  test('produces 10_000 unique keys within the same day-prefix', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      keys.add(createStorageKey('file.txt', 'uploads'));
    }
    expect(keys.size).toBe(10_000);
  });

  test('produces a valid key shape even with malformed inputs', () => {
    const key = createStorageKey('..\n..\npasswd', '///uploads//');

    expect(key).toMatch(/^uploads\/2026\/04\/17\/[A-Za-z0-9_-]{10}\//);
    expect(key).not.toContain('//');
    expect(key).not.toContain('\\');

    const filenamePart = key.replace(/^uploads\/2026\/04\/17\/[A-Za-z0-9_-]{10}\//, '');
    expect(filenamePart).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});
