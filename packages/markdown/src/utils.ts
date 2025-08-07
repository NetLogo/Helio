import axios from 'axios';
import * as fs from 'fs/promises';

/**
 * Joins an array of strings with a separator, ignoring any null, undefined, or empty strings.
 * @param parts - Array of strings to join, ignoring any that are null, undefined, or empty
 * @param sep   - Separator to use (default: '.')
 * @returns Joined string
 */
const joinIgnoreNone = (parts: Array<string | null | undefined>, sep = '.') => {
  return parts.filter(Boolean).join(sep);
};

/**
 * Checks if a given string is a URL (starts with http:// or https://).
 * @param value - String to check if it's a URL
 * @returns True if the string is a URL (starts with http:// or https://), false otherwise
 */
const isURL = (value: string): boolean => {
  return /^https?:\/\//i.test(value);
};

/**
 * Reads data from a remote URL using axios.
 * @param url - URL to fetch data from
 * @returns Fetched data as a string
 */
const readRemote = async (url: string): Promise<string> => {
  const { data } = await axios.get(url);
  return data;
};

/**
 * Reads data from a local file.
 * @param filePath - Path to the local file
 * @returns File contents as a string
 */
async function readLocal(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Gets file extension from a given path or URL.
 * Considers query parameters and returns only the extension.
 * @param value - File path or URL
 * @returns File extension (including the dot), or empty string if none
 */
const getFileExtension = (value: string): string => {
  const match = value.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? `.${match[1]}` : '';
};

export { getFileExtension, isURL, joinIgnoreNone, readLocal, readRemote };
