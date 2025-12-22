import { slugifyOptions } from '@repo/netlogo-docs/helpers';
import slugify from 'slugify';

const getProductHome = (productId: string): string => {
  return `/product/${slugify(productId, slugifyOptions)}`;
};

const slugToPath = (slug: string | string[]): string => {
  if (Array.isArray(slug)) {
    return '/' + slug.map((s) => encodeURIComponent(s)).join('/');
  } else {
    return '/' + encodeURIComponent(slug);
  }
};

const addLeadingSlash = (path: string): string => {
  if (!path.startsWith('/')) {
    return '/' + path;
  }
  return path;
};

export { addLeadingSlash, getProductHome, slugToPath };
