import { randomUUID } from 'node:crypto';
import {
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_SIZE,
  type FileEntity,
} from '#src/modules/file/domain/file.types.ts';
import {
  FileTooLargeError,
  FileTypeNotAllowedError,
} from '#src/modules/file/domain/file.errors.ts';

export default function fileDomain() {
  return {
    createFile(props: {
      buffer: Buffer;
      filename: string;
      contentType: string;
    }): FileEntity {
      if (props.buffer.length > MAX_FILE_SIZE) {
        throw new FileTooLargeError(props.buffer.length, MAX_FILE_SIZE);
      }
      if (
        !ALLOWED_CONTENT_TYPES.includes(
          props.contentType as (typeof ALLOWED_CONTENT_TYPES)[number],
        )
      ) {
        throw new FileTypeNotAllowedError(props.contentType);
      }

      return {
        id: randomUUID(),
        filename: props.filename,
        contentType: props.contentType,
        sizeBytes: BigInt(props.buffer.length),
        blob: props.buffer,
        createdAt: new Date(),
      };
    },
  };
}
