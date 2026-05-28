export function isValidNetlogoFilename(filename: string): boolean {
  const allowedExtensions = ['.nlogo', '.nlogo3d', '.nlogox', '.nlogox3d'];
  const lowerFilename = filename.toLowerCase();
  return allowedExtensions.some((ext) => lowerFilename.endsWith(ext));
}
