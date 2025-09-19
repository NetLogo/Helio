export function getLocationDepthIgnorePrefixedURL(prefix: string) {
  const matcher = new RegExp(`^/${prefix.replace(/^\/|\/$/g, '')}(?=/|$)`);
  const offset = matcher.test(window.location.pathname) ? -1 : 0;

  return window.location.pathname.split('/').filter((p) => p.length).length + offset;
}
