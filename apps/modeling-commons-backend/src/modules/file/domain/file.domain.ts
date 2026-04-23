import {
  DENIED_CONTENT_TYPES,
  MAX_FILE_SIZE,
  PUBLIC_PREFIX,
  type FileAccess,
  type FileEntity,
} from '#src/modules/file/domain/file.types.ts';
import {
  FileTooLargeError,
  FileTypeNotAllowedError,
} from '#src/modules/file/domain/file.errors.ts';
import { createStorageKey, sanitizeFilename } from '#src/shared/storage/utils.ts';

export default function fileDomain() {
  function checkContentType(contentType: string): boolean {
    if (DENIED_CONTENT_TYPES.includes(contentType as (typeof DENIED_CONTENT_TYPES)[number])) {
      return false;
    }
    return true;
  }

  return {
    createFile(props: {
      buffer: Buffer<ArrayBuffer>;
      filename: string;
      contentType: string;
      access?: FileAccess;
      pathPrefix?: string;
    }): FileEntity {
      if (props.buffer.length > MAX_FILE_SIZE) {
        throw new FileTooLargeError(props.buffer.length, MAX_FILE_SIZE);
      }
      if (!checkContentType(props.contentType)) {
        throw new FileTypeNotAllowedError(props.contentType);
      }

      const access: FileAccess = props.access ?? 'private';
      const basePrefix = props.pathPrefix ?? '';
      // Public files live under a shared prefix so a CDN can cache the
      // entire subtree with one rule.
      const pathPrefix =
        access === 'public-read'
          ? basePrefix
            ? `${PUBLIC_PREFIX}/${basePrefix.replace(/^\/+|\/+$/g, '')}`
            : PUBLIC_PREFIX
          : basePrefix;

      return {
        key: createStorageKey(props.filename, pathPrefix),
        contentType: props.contentType,
        sizeBytes: BigInt(props.buffer.length),
        blob: props.buffer,
        metadata: {
          filename: sanitizeFilename(props.filename),
          createdAt: new Date().toISOString(),
        },
        access,
      };
    },
  };
}
