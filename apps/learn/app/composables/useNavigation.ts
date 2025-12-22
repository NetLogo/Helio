import type { CommandPaletteGroup } from '@nuxt/ui';
import { createSharedComposable } from '@vueuse/core';

function _useHeaderLinks() {
  const route = useRoute();

  const headerLinks = computed(() => {
    return getTagsInfo()
      .map((tag) => ({
        label: tag.title,
        description: tag.subtitle(),
        icon: tag.icon,
        to: tag.path,
        active: route.path.startsWith(tag.startsWith),
      }))
      .concat({
        label: 'Resources',
        description: 'Browse learning resources',
        icon: 'i-lucide-bookmark',
        to: '/resources',
        active: route.path.startsWith('/resources'),
      });
  });

  return { headerLinks };
}

export const useHeaderLinks = import.meta.client ? createSharedComposable(_useHeaderLinks) : _useHeaderLinks;

const footerLinks: Array<{ label: string; children: Array<{ label: string; to: string }> }> = [];

export const useFooterLinks = () => ({ footerLinks });

const _useNavigation = () => {
  const route = useRoute();
  const searchTerm = ref<string>('');

  const { headerLinks } = useHeaderLinks();
  const { footerLinks } = useFooterLinks();
  const { products } = useProducts();

  const searchLinks = computed(() => [...headerLinks.value.filter(Boolean)]);

  const productItems = computed(() =>
    products.value
      .aggregate((p) => p)
      .map((product) => ({
        id: `product-${product.name}`,
        label: product.name,
        suffix: product.description,
        avatar: {
          src: product.logoUrl,
          ui: {
            root: 'rounded-none bg-transparent',
          },
        },
        to: `${getProductHome(product.id)}`,
        _searchFields: [product.name, product.id].filter(Boolean),
      })),
  );

  const searchGroups = computed<CommandPaletteGroup[]>(() => [
    {
      id: 'products-search',
      label: 'Products',
      items: productItems.value,
    },
  ]);

  const sidebarLinks = computed(() => [
    {
      title: 'Learning Content',
      path: '/published/all',
      icon: 'i-lucide-book-open',
      children: getTagsInfo()
        .map((tag) => ({
          title: tag.title,
          path: tag.path,
          icon: tag.icon,
          active: route.path.startsWith(tag.startsWith),
        }))
        .concat({
          title: 'Resources',
          path: '/resources',
          icon: 'i-lucide-bookmark',
          active: route.path.startsWith('/resources'),
        }),
    },
    {
      title: 'Products',
      path: '',
      icon: 'i-lucide-box',
      children: products.value
        .aggregate((p) => p)
        .map((product) => ({
          title: product.name,
          path: getProductHome(product.id),
          icon: product.iconName,
          active: route.path.startsWith(getProductHome(product.id)),
        })),
    },
    {
      title: 'NetLogo Ecosystem',
      path: 'https://www.netlogo.org',
      icon: 'netlogo-turtles',
      external: true,
      children: [
        { title: 'NetLogo', path: 'https://www.netlogo.org', icon: 'netlogo-netlogo-desktop', external: true },
        { title: 'NetLogo User Guide', path: 'https://docs.netlogo.org', icon: 'i-lucide-book', external: true },
        {
          title: 'Modeling Commons',
          path: 'https://https://modelingcommons.org',
          icon: 'i-lucide-globe',
          external: true,
        },
        { title: 'NetLogo Forum', path: 'https://forum.netlogo.org', icon: 'i-lucide-message-circle', external: true },
      ],
    },
  ]);

  return {
    searchTerm,
    headerLinks,
    footerLinks,
    searchLinks,
    searchGroups,
    sidebarLinks,
  };
};

export const useNavigation = import.meta.client ? createSharedComposable(_useNavigation) : _useNavigation;
