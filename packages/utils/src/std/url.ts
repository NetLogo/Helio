export function rebaseURL(url?: string | null): string {
  if (!url) return '';
  if (!window) return url;

  const baseTag = document.querySelector('base');
  if (!baseTag) return url;

  const baseHref = baseTag.getAttribute('href');
  if (!baseHref) return url;

  try {
    const baseURL = new URL(baseHref, window.location.href);
    const absoluteURL = new URL(url, baseURL);
    return absoluteURL.toString();
  } catch {
    return url;
  }
}

export function flatBaseFromDepth(depth: number) {
  if (depth <= 0) return './';
  return '../'.repeat(depth);
}
