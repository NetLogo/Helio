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

export type FileEntity = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: bigint;
  blob: Buffer;
  createdAt: Date;
};
