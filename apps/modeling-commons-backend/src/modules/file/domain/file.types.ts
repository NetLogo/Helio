import Schema from 'typebox/schema';
import Type, { type Static } from 'typebox';

export const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

export const ALLOWED_CONTENT_TYPES = [
  'application/octet-stream',
  'application/x-netlogo',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/csv',
] as const;

export const PUBLIC_PREFIX = 'files/public';

export type FileAccess = 'public-read' | 'private';

export const fileMetadata = Type.Object({
  filename: Type.String(),
  createdAt: Type.String({
    format: 'date-time',
    description: 'ISO string of the file creation date',
  }),
  deletedAt: Type.Optional(
    Type.String({
      format: 'date-time',
      description: 'ISO string of the file deletion date, if applicable',
    }),
  ),
});

export const fileMetadataSchema = Schema.Compile(fileMetadata);

export type FileMetadata = Static<typeof fileMetadata>;

export type FileEntity = {
  key: string;
  contentType: string;
  sizeBytes: bigint;
  blob: Buffer<ArrayBuffer>;
  metadata: FileMetadata;
  access: FileAccess;
};

export function isPublicKey(key: string): boolean {
  return key.startsWith(`${PUBLIC_PREFIX}/`);
}
