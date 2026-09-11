import type { CommandPaletteGroup } from '@nuxt/ui';
import { createSharedComposable } from '@vueuse/core';

function _useHeaderLinks() {
  const headerLinks = computed(() => {
    return [];
  });

  return { headerLinks };
}

export const useHeaderLinks = import.meta.client ? createSharedComposable(_useHeaderLinks) : _useHeaderLinks;

const footerLinks: Array<{ label: string; children: Array<{ label: string; to: string }> }> = [];

export const useFooterLinks = () => ({ footerLinks });

const _useNavigation = () => {
  const searchTerm = ref<string>('');

  const { headerLinks } = useHeaderLinks();
  const { footerLinks } = useFooterLinks();

  const searchLinks = computed(() => [...headerLinks.value.filter(Boolean)]);

  const searchGroups = computed<CommandPaletteGroup[]>(() => []);

  const sidebarLinks = computed(() => [
    {
      title: 'NetTango',
      icon: 'netlogo-nettango',
      path: '/',
      children: [
        {
          title: 'Models Gallery',
          path: '/models-gallery',
          icon: 'lucide:images'
        },
        {
          title: 'Getting Started',
          icon: 'lucide:book-open',
          path: '/docs/#',
          children: [
            {
              title: 'Learn NetTango Builder',
              path: '/tutorials/introduction-to-the-nettango-builder',
              icon: 'lucide:file-text',
            }
          ]
        },
        {
          title: 'NetLogo Products',
          path: 'https://www.netlogo.org',
          icon: 'netlogo-turtles',
          external: true,
          children: [
            { title: 'NetLogo Desktop', path: 'https://www.netlogo.org', icon: 'netlogo-netlogo-desktop-fill', external: true },
            { title: 'NetLogo Web', path: 'https://www.netlogoweb.org', icon: 'netlogo-netlogo-web-fill', external: true },
            { title: 'HubNet Web', path: 'https://hubnetweb.org/', icon: 'netlogo-hubnet-web-fill', external: true },
            { title: 'Behavior Search', path: 'https://www.behaviorsearch.org/', icon: 'netlogo-behavior-search-fill', external: true },
          ]
        },
        {
          title: 'NetLogo Community',
          icon: 'lucide-users',
          external: true,
          path: 'https://www.netlogo.org/',
          children: [
            { title: 'NetLogo User Guide', path: 'https://docs.netlogo.org', icon: 'i-lucide-book', external: true },
            { title: 'NetLogo Forum', path: 'https://forum.netlogo.org', icon: 'lucide:message-square-more', external: true },
            {
              title: 'Modeling Commons',
              path: 'https://https://modelingcommons.org',
              icon: 'lucide:shapes',
              external: true,
            },
            { title: 'NetLogo Forum', path: 'https://forum.netlogo.org', icon: 'i-lucide-message-circle', external: true },
            { title: 'NetLogo Conference', path: 'https://conference.netlogo.org/', icon: 'lucide:calendar-1', external: true },
          ],
        },
        {
          "title": 'Donate to NetLogo',
          "path": 'https://give.northwestern.edu/campaigns/37603/donations/new?a=9727914&designation_id=N3004411',
          "icon": 'lucide:heart',
          "external": true,
        }
      ]
    }
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
