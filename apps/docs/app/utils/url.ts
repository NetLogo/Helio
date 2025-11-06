export function removeHtmlExtension(url: string): string {
  return url.replace(/\.html$/, '');
}
