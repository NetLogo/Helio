import { describe, it, expect } from 'vitest';
import fileDomain from '#src/modules/file/domain/file.domain.ts';
import { FileTooLargeError, FileTypeNotAllowedError } from '#src/modules/file/domain/file.errors.ts';
import { MAX_FILE_SIZE } from '#src/modules/file/domain/file.types.ts';

const domain = fileDomain();

describe('fileDomain', () => {
  describe('createFile', () => {
    it('creates file entity', () => {
      const file = domain.createFile({
        buffer: Buffer.from('test'),
        filename: 'model.nlogox',
        contentType: 'application/octet-stream',
      });

      expect(file.id).toBeTypeOf('string');
      expect(file.filename).toBe('model.nlogox');
      expect(file.sizeBytes).toBe(BigInt(4));
    });

    it('throws FileTooLargeError for oversized file', () => {
      const buffer = Buffer.alloc(MAX_FILE_SIZE + 1);
      expect(() =>
        domain.createFile({ buffer, filename: 'big.bin', contentType: 'application/octet-stream' }),
      ).toThrow(FileTooLargeError);
    });

    it('throws FileTypeNotAllowedError for disallowed type', () => {
      expect(() =>
        domain.createFile({
          buffer: Buffer.from('test'),
          filename: 'bad.exe',
          contentType: 'application/x-executable',
        }),
      ).toThrow(FileTypeNotAllowedError);
    });
  });
});
