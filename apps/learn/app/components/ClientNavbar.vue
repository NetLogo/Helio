<template>
  <Navbar id="main-navbar" ref="navbar" :brand="brand" brand-href="/" :brand-attrs="brandAttrs">
    <NavbarLinksContainer>
      <NavbarItem
        v-for="link in navbarLinks"
        :key="link.title"
        :title="link.title"
        :href="link.href"
        :columns="link.columns"
        :active="link.active"
      >
        <!-- eslint-disable-next-line vue/no-use-v-if-with-v-for -->
        <template v-if="link.children && link.children.length > 0">
          <NavbarDropdownItem
            v-for="child in link.children"
            :key="child.title"
            :title="child.title"
            :href="child.href"
            :active="child.active"
          />
        </template>
      </NavbarItem>
    </NavbarLinksContainer>

    <NavbarActionsContainer>
      <ClientOnly>
        <SSRUContentSearchButton />
      </ClientOnly>
    </NavbarActionsContainer>
  </Navbar>

  <NavbarHeightTracker navbar-selector="#main-navbar" />
</template>

<script setup lang="ts">
import NetLogoLearnGuideLogo from '@repo/vue-ui/assets/brands/NetLogoLearnGuide.svg';
import TurtlesLogo from '@repo/vue-ui/assets/brands/Turtles.svg';
import type { Navbar as _Navbar } from '@repo/vue-ui/components/navbar/index';
import { useMediaQuery } from '@vueuse/core';
import { onMounted, ref, watch } from 'vue';
import { products } from '~/assets/products';

interface NavbarLink {
  title: string;
  href: string;
  columns?: number;
  children?: Array<Omit<NavbarLink, 'children'>>;
  active?: boolean;
}

const route = useRoute();

const isMobileScreen = ref(false);
const navbarRef = useTemplateRef<InstanceType<typeof _Navbar>>('navbar');

const brand = computed(() => (isMobileScreen.value ? TurtlesLogo : NetLogoLearnGuideLogo));
const brandAttrs = computed(() =>
  isMobileScreen.value ? { style: { width: '2rem' } } : { width: 'auto', style: { marginLeft: '1rem' } },
);

const handleMediaQueryChange = (): void => {
  if (import.meta.client) {
    const mediaQuery = useMediaQuery('(max-width: 768px)');
    watch(
      mediaQuery,
      (value) => {
        isMobileScreen.value = value;
      },
      { immediate: true },
    );
  }
};

const navbarLinks = ref<Array<NavbarLink>>([
  {
    title: 'Home',
    href: '/',
    columns: 2,
    children: products.aggregate((p) => p).map((p) => ({ title: `Learn ${p.name}`, href: getProductHome(p.id) })),
  },
  {
    title: 'Get Started',
    href: '/articles/getting-started-with-netlogo',
    children: [
      { title: 'Getting Started with NetLogo', href: '/articles/getting-started-with-netlogo' },
      { title: 'Tutorial #0 - Party Model', href: '/getting-started/tutorial-0' },
      { title: 'Tutorial #1 - Models', href: '/getting-started/tutorial-1' },
      { title: 'Tutorial #2 - Commands', href: '/getting-started/tutorial-2' },
      { title: 'Tutorial #3 - Procedures', href: '/getting-started/tutorial-3' },
    ],
  },
  {
    title: 'Learning Paths',
    href: '/learning-paths',
    children: [
      { title: 'For Educators', href: '/learning-paths/for-educators' },
      { title: 'For Students', href: '/learning-paths/for-students' },
      { title: 'For Researchers', href: '/learning-paths/for-researchers' },
      { title: 'Advanced NetLogo Guide', href: '/learning-paths/for-advanced' },
    ],
  },
  {
    title: 'Articles and Tutorials',
    href: '/published/all',
    children: [
      { title: 'Getting Started', href: '/published/getting-started' },
      { title: 'Articles', href: '/published/articles' },
      { title: 'Tutorials', href: '/published/tutorials' },
      { title: 'Video Tutorials', href: '/published/video-tutorials' },
    ],
  },
  {
    title: 'Resources',
    href: '/resources',
  },
]);

const updateActiveStates = () => {
  navbarRef.value?.blur();
  const currentPath = route.path;

  navbarLinks.value = navbarLinks.value.map((link) => ({
    ...link,
    active: isLinkParentActive(link, currentPath),
    children: link.children?.map((child) => ({
      ...child,
      active: isSublinkActive(child.href, currentPath),
    })),
  }));
};

const arePathnamesCongruent = (windowPathname: string, candidatePathname: string): boolean => {
  const normalize = (pathname: string) =>
    pathname
      .split('/')
      .filter((p) => p.length > 0)
      .map((p) => p.replace(/\$/, ''))
      .map((p) => p.trim().split('#')[0] ?? '')
      .join('/');

  return normalize(windowPathname) === normalize(candidatePathname);
};

const isSublinkActive = (href: string | undefined, currentPath: string): boolean => {
  if (typeof href !== 'string') return false;
  return arePathnamesCongruent(currentPath, href);
};

const isLinkParentActive = (link: NavbarLink, currentPath: string): boolean => {
  const isParentActiveOnItsOwn = arePathnamesCongruent(currentPath, link.href);
  return (
    isParentActiveOnItsOwn || (link.children ?? []).some((child) => isSublinkActive(child.href, currentPath)) || false
  );
};

updateActiveStates();

onMounted(() => {
  if (import.meta.client) {
    updateActiveStates();
    handleMediaQueryChange();
  }
});

watch(
  () => route.path,
  () => {
    if (import.meta.client) {
      updateActiveStates();
    }
  },
);
</script>
