import { describe, it, expect } from 'vitest';
import fileDomain from '#src/modules/file/domain/file.domain.ts';
import {
  FileTooLargeError,
  FileTypeNotAllowedError,
} from '#src/modules/file/domain/file.errors.ts';
import { PUBLIC_PREFIX } from '#src/modules/file/domain/file.types.ts';
import rules from '#src/config/rules.ts';

const MAX_FILE_SIZE = rules.limits.fileUpload.size.max ?? 0;

const domain = fileDomain();

describe('fileDomain', () => {
  describe('createFile', () => {
    it('defaults to private access and no public prefix', () => {
      const file = domain.createFile({
        buffer: Buffer.from('test') as Buffer<ArrayBuffer>,
        filename: 'model.nlogox',
        contentType: 'application/octet-stream',
      });

      expect(file.access).toBe('private');
      expect(file.key.startsWith(`${PUBLIC_PREFIX}/`)).toBe(false);
      expect(file.metadata.filename).toBe('model.nlogox');
      expect(file.sizeBytes).toBe(BigInt(4));
    });

    it('places public-read files under the shared public prefix', () => {
      const file = domain.createFile({
        buffer: Buffer.from('img') as Buffer<ArrayBuffer>,
        filename: 'logo.png',
        contentType: 'image/png',
        access: 'public-read',
      });

      expect(file.access).toBe('public-read');
      expect(file.key.startsWith(`${PUBLIC_PREFIX}/`)).toBe(true);
    });

    it('appends pathPrefix after the public prefix', () => {
      const file = domain.createFile({
        buffer: Buffer.from('img') as Buffer<ArrayBuffer>,
        filename: 'a.png',
        contentType: 'image/png',
        access: 'public-read',
        pathPrefix: 'avatars',
      });

      expect(file.key.startsWith(`${PUBLIC_PREFIX}/avatars/`)).toBe(true);
    });

    it('throws FileTooLargeError for oversized file', () => {
      const buffer = Buffer.alloc(MAX_FILE_SIZE + 1) as Buffer<ArrayBuffer>;
      expect(() =>
        domain.createFile({ buffer, filename: 'big.bin', contentType: 'application/octet-stream' }),
      ).toThrow(FileTooLargeError);
    });

    it('throws FileTypeNotAllowedError for disallowed type', () => {
      expect(() =>
        domain.createFile({
          buffer: Buffer.from('test') as Buffer<ArrayBuffer>,
          filename: 'bad.exe',
          contentType: 'application/x-executable',
        }),
      ).toThrow(FileTypeNotAllowedError);
    });
  });
});
