import getConfig from 'next/config';

export function applyNextBasePath(href: string) {
  try {
    const { publicRuntimeConfig } = getConfig();
    const basePath = publicRuntimeConfig.basePath;
    if (!basePath) return href;

    if (href.startsWith('/')) {
      return href.startsWith('#') || href.startsWith('?')
        ? `${basePath}${href}`
        : `${basePath}/${href.replace(/^\/+/, '')}`;
    }
    return href;
  } catch (error) {
    return href;
  }
}

export function applyNextBasePathToSrcSet(srcSet: string) {
  return srcSet
    .split(',')
    .map((entry) => {
      const [url, descriptor] = entry.trim().split(/\s+/);
      if (!url) return entry;
      const newUrl = applyNextBasePath(url);
      return descriptor ? `${newUrl} ${descriptor}` : newUrl;
    })
    .join(', ');
}

export function removeNextBasePath(href: string) {
  try {
    const { publicRuntimeConfig } = getConfig();
    const basePath = publicRuntimeConfig.basePath;
    if (basePath && href.startsWith(basePath)) {
      return href.slice(basePath.length) || '/';
    }
    return href;
  } catch (error) {
    return href;
  }
}
