import { createHash } from 'node:crypto';

export type AccessPolicy = 'public-read' | 'private';

/**
 * A stable stand-in for randomUUID, so re-deriving a key for the same legacy row
 * yields the same object rather than a fresh copy on every run.
 */
export function derivedUuid(namespace: string, id: number | string): string {
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
  modelUuid: string,
  d: Date,
  fileUuid: string,
  filename: string = 'file',
  accessPolicy: AccessPolicy = 'private',
): string {
  const { y, m, day } = dateParts(d);
  return `${getAccessPrefix(accessPolicy)}/models/${modelUuid}/versions/${y}/${m}/${day}/${fileUuid}/${sanitizeFilename(filename)}`;
}

export function buildPreviewFileKey(
  modelUuid: string,
  d: Date,
  fileUuid: string,
  filename: string = 'file',
): string {
  const { y, m, day } = dateParts(d);
  return `${getAccessPrefix('public-read')}/models/${modelUuid}/preview-images/${y}/${m}/${day}/${fileUuid}/${sanitizeFilename(filename)}`;
}

export function buildAttachmentFileKey(
  modelUuid: string,
  d: Date,
  fileUuid: string,
  filename: string = 'file',
): string {
  const { y, m, day } = dateParts(d);
  return `${getAccessPrefix('private')}/models/${modelUuid}/additionalFiles/${y}/${m}/${day}/${fileUuid}/${sanitizeFilename(filename)}`;
}

export function buildAvatarFileKey(
  userUuid: string,
  d: Date,
  fileUuid: string,
  filename: string = 'file',
): string {
  const { y, m, day } = dateParts(d);
  return `${getAccessPrefix('public-read')}/avatars/${userUuid}/${y}/${m}/${day}/${fileUuid}/${sanitizeFilename(filename)}`;
}
