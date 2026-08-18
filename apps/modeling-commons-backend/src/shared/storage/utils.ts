import { nanoid } from 'nanoid';

/**
 * @param filename The original filename to be sanitized.
 * @return A sanitized filename with only [A-Za-z0-9._-] characters and no leading dots.
 *
 * @example
 * sanitizeFilename('my model.png')
 * // returns: 'my_model.png'
 *
 * sanitizeFilename('../../etc/passwd')
 * // returns: '_.._etc_passwd'
 */
export function sanitizeFilename(filename: string): string {
  const replaceChar = '_';

  return filename
    .replace(/^\.+/, replaceChar)
    .replace(/^[A-Za-z]:[\\/]/, replaceChar)
    .replace(/[^A-Za-z0-9._-]/g, replaceChar);
}

/**
 * @param filename The original filename to be sanitized and included in the storage key.
 * @param path The path prefix for organizing files (e.g. `uploads/models`)
 * @return A storage key in the format: `{path}/{YYYY}/{MM}/{DD}/{randomId}/{sanitizedFilename}`
 *
 * @example
 * createStorageKey('my model.png', 'uploads/models')
 * // returns: 'uploads/models/2024/06/25/AbCdEfGhIj/my_model.png'
 */
export function createStorageKey(filename: string, path: string): string {
  const sanitizedFilename = sanitizeFilename(filename);
  const today = new Date();

  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');

  // Remove leading/trailing slashes from the path to prevent
  // issues with key construction
  // -Omar Ibrahim, Apr 17 26
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');

  const timepath = `${year}/${month}/${day}`;
  const id = nanoid(10);

  if (normalizedPath.length === 0) {
    return `${timepath}/${id}/${sanitizedFilename}`;
  }

  return `${normalizedPath}/${timepath}/${id}/${sanitizedFilename}`;
}
