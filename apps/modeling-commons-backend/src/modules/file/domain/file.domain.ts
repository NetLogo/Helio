import {
  PUBLIC_PREFIX,
  type FileAccess,
  type FileEntity,
} from '#src/modules/file/domain/file.types.ts';
import { FileTooLargeError } from '#src/modules/file/domain/file.errors.ts';
import { createStorageKey, sanitizeFilename } from '#src/shared/storage/utils.ts';
import rules from '#src/config/rules.ts';

export default function fileDomain() {
  return {
    createFile(props: {
      buffer: Buffer;
      filename: string;
      contentType: string;
      access?: FileAccess;
      pathPrefix?: string;
      userId?: string;
    }): FileEntity {
      const maxSize = rules.limits.fileUpload.size.max;
      if (maxSize && props.buffer.length > maxSize) {
        throw new FileTooLargeError(props.buffer.length, maxSize);
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
          userId: props.userId,
          createdAt: new Date().toISOString(),
        },
        access,
      };
    },
  };
}
