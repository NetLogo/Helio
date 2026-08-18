import { createHash } from 'node:crypto';

export type AccessPolicy = 'public-read' | 'private';

/**
 * Frozen storage-path format, not an identifier: the incremental sync must
 * re-derive the same S3 object key for the same legacy row on every run, and
 * that determinism predates the NanoID migration. This is a deliberate
 * exception to the repo-wide NanoID rule; do not change its output.
 */
export function storagePathHash(namespace: string, id: number | string): string {
  const hex = createHash('sha256').update(`${namespace}:${id}`).digest('hex');
  const version = `4${hex.slice(13, 16)}`;
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}-${variant}-${hex.slice(20, 32)}`;
}

function dateParts(d: Date) {
  const y = d.getUTCFullYear().toString();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return { y, m, day };
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[/\\]/g, '_')
    .trim();
  return cleaned || 'file';
}

export function getAccessPrefix(access: AccessPolicy): string {
  return access === 'public-read' ? 'files/public/uploads' : 'uploads';
}

export function buildVersionFileKey(
  modelId: string,
  d: Date,
  fileId: string,
  filename: string = 'file',
  accessPolicy: AccessPolicy = 'private',
): string {
  const { y, m, day } = dateParts(d);
  return `${getAccessPrefix(accessPolicy)}/models/${modelId}/versions/${y}/${m}/${day}/${fileId}/${sanitizeFilename(filename)}`;
}

export function buildPreviewFileKey(
  modelId: string,
  d: Date,
  fileId: string,
  filename: string = 'file',
): string {
  const { y, m, day } = dateParts(d);
  return `${getAccessPrefix('public-read')}/models/${modelId}/preview-images/${y}/${m}/${day}/${fileId}/${sanitizeFilename(filename)}`;
}

export function buildAttachmentFileKey(
  modelId: string,
  d: Date,
  fileId: string,
  filename: string = 'file',
): string {
  const { y, m, day } = dateParts(d);
  return `${getAccessPrefix('private')}/models/${modelId}/additionalFiles/${y}/${m}/${day}/${fileId}/${sanitizeFilename(filename)}`;
}

export function buildAvatarFileKey(
  userId: string,
  d: Date,
  fileId: string,
  filename: string = 'file',
): string {
  const { y, m, day } = dateParts(d);
  return `${getAccessPrefix('public-read')}/avatars/${userId}/${y}/${m}/${day}/${fileId}/${sanitizeFilename(filename)}`;
}
