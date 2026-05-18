import Schema from 'typebox/schema';
import Type, { type Static } from 'typebox';
import { FileNotFoundError } from './file.errors.ts';

export const PUBLIC_PREFIX = 'files/public';

export type FileAccess = 'public-read' | 'private';

export const fileMetadata = Type.Object({
  filename: Type.String(),
  userId: Type.Optional(Type.String({ format: 'uuid' })),
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

export function parseMetadata(key: string, raw: unknown): FileMetadata {
  const rawRecord: Record<string, unknown> = (raw as Record<string, unknown>) || {};

  // S3 metadata keys are case-insensitive and normalized to lowercase.
  // -Omar Ibrahim, Apr 23 26
  const normalized: {
    [K in keyof FileMetadata]: unknown;
  } = {
    filename: rawRecord['filename'],
    userId: rawRecord['userid'],
    createdAt: rawRecord['createdat'],
    deletedAt: rawRecord['deletedat'],
  };

  const parsed = fileMetadataSchema.Parse(normalized);
  if (parsed.deletedAt) throw new FileNotFoundError(key);
  return parsed;
}

export type FileMetadata = Static<typeof fileMetadata>;

export type FileEntity = {
  key: string;
  contentType: string;
  sizeBytes: bigint;
  blob: Buffer;
  metadata: FileMetadata;
  access: FileAccess;
};

export function isPublicKey(key: string): boolean {
  return key.startsWith(`${PUBLIC_PREFIX}/`);
}
