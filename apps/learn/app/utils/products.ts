import type { UserProps } from '@nuxt/ui';
import type { Product } from '~/assets/products';

function productToUserProps(p: Product): UserProps & { 'aria-label': string } {
  return {
    name: p.name,
    description: p.description,
    avatar: { src: p.iconUrl },
    to: getProductHome(p.id),
    target: '_blank',
    'aria-label': `Visit ${p.name} home page`,
  };
}

function productToImageLinkProps(p: Product) {
  return {
    src: p.iconUrl,
    alt: p.name,
    title: p.name,
    href: getProductHome(p.id),
  };
}

export { productToImageLinkProps, productToUserProps };
