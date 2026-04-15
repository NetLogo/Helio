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
      <SSRUContentSearchButton />

      <VersionSelectDropdown
        :versions="versions"
        :selected-version="selectedVersion"
        @version-change="(version) => onVersionChange(version, { productVersion, productWebsite })"
      />

      <NavbarAction href="https://github.com/NetLogo" aria-label="NetLogo GitHub Repository">
        <Icon name="fa6-brands:github" class="w-5 h-5" />
      </NavbarAction>

      <NavbarAction
        :href="`/${productVersion}/NetLogo_User_Manual.pdf`"
        aria-label="Download NetLogo User Manual as PDF"
        :no-nuxt-link="true"
      >
        <Icon name="fa6-solid:file-pdf" class="w-5 h-5" />
      </NavbarAction>
    </NavbarActionsContainer>
  </Navbar>

  <NavbarHeightTracker navbar-selector="#main-navbar" />
</template>

<script setup lang="ts">
import NetLogoUserManualLogo from '@repo/vue-ui/assets/brands/NetLogoUserManual.svg';
import TurtlesLogo from '@repo/vue-ui/assets/brands/Turtles.svg';
import type { Navbar as _Navbar } from '@repo/vue-ui/components/navbar/index';
import type { VersionProps } from '@repo/vue-ui/widgets/VersionSelectDropdown.vue';
import { useMediaQuery } from '@vueuse/core';
import { onMounted, ref, watch } from 'vue';
import { onVersionChange, pullVersionsFromSource } from '~~/shared/versions';

const {
  public: {
    website: { productWebsite, productVersion, versionsSrc  },
  },
} = useRuntimeConfig();

interface NavbarLink {
  title: string;
  href: string;
  columns?: number;
  children?: Array<Omit<NavbarLink, 'children'>>;
  active?: boolean;
}

const route = useRoute();
const extensionList = useRuntimeConfig().public.extensions as Array<{
  title: string;
  href: string;
}>;

const isMobileScreen = ref(false);
const navbarRef = useTemplateRef<InstanceType<typeof _Navbar>>('navbar');

const brand = computed(() => (isMobileScreen.value ? TurtlesLogo : NetLogoUserManualLogo));
const brandAttrs = computed(() => (isMobileScreen.value ? { style: { width: '2rem' } } : { width: 'auto' }));


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

const navbarLinks = ref<NavbarLink[]>([
  {
    title: 'Home',
    href: '/',
  },
  {
    title: 'Learn NetLogo',
    href: '/whatis',
    children: [
      { title: 'What is NetLogo?', href: '/whatis' },
      { title: 'Tutorial #0 Sample Model', href: '/sample' },
      { title: 'Tutorial #1 Models', href: '/tutorial1' },
      { title: 'Tutorial #2 Commands', href: '/tutorial2' },
      { title: 'Tutorial #3 Procedures', href: '/tutorial3' },
    ],
  },
  {
    title: 'Documentation',
    href: '/dictionary',
    children: [
      { title: 'NetLogo Dictionary', href: '/dictionary' },
      { title: 'Interface Guide', href: '/interface' },
      { title: 'Interface Tab Guide', href: '/interfacetab' },
      { title: 'Info Tab Guide', href: '/infotab' },
      { title: 'Code Tab Guide', href: '/codetab' },
      { title: 'Programming Guide', href: '/programming' },
      { title: 'Transition Guide', href: '/transition' },
      { title: 'Preferences Guide', href: '/netlogopreferences' },
      { title: 'Version History', href: '/versions' },
    ],
  },
  {
    title: 'Advanced Tools',
    href: '/extension-manager',
    columns: 2,
    children: [
      { title: 'Extension Manager', href: '/extension-manager' },
      { title: 'Shapes Editor', href: '/shapes' },
      { title: 'BehaviorSpace', href: '/behaviorspace' },
      { title: 'System Dynamics', href: '/systemdynamics' },
      { title: 'HubNet', href: '/hubnet' },
      { title: 'HubNet Authoring', href: '/hubnet-authoring' },
      { title: 'Logging', href: '/logging' },
      { title: 'Controlling', href: '/controlling' },
      { title: 'Mathematica Link', href: '/mathematica' },
      { title: 'NetLogo 3D', href: '/3d' },
      { title: 'NetLogoLab', href: '/lab' },
      { title: 'Cluster Computing (HPC)', href: '/hpc' },
    ],
  },
  {
    title: 'Extensions',
    href: '/extensions',
    columns: 2,
    children: [{ title: 'Extensions Guide', href: '/extensions' }, ...extensionList],
  },
  {
    title: 'FAQ',
    href: '/faq',
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
      .filter((p) => p !== productVersion)
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

// Version selection
const versions = ref<Record<string, VersionProps>>({
  [productVersion]: { displayName: productVersion },
  '7.0.2': { displayName: '7.0.2' },
  '7.0.1': { displayName: '7.0.1' },
  '7.0.0': { displayName: '7.0.0' },
  '7.0.0-beta2': { displayName: '7.0.0 Beta 2' },
  '6.4.0': {},
  '6.3.0': {},
  '6.2.2': {},
  '6.1.1': {},
  '6.0.4': {},
  '6.0-BETA1': { displayName: '6.0 Beta' },
  '5.3.1': {},
  '5.2.1': {},
  '5.1.0': {},
  '5.0': {},
  '4.1': {},
  '4.0': {},
  '3.2': {},
  '3.1': {},
  '3.0': {},
  '2.1': { disabled: true },
  '2.0': { disabled: true },
  '1.2': { disabled: true },
  '1.1': { disabled: true },
  '1.0': { disabled: true },
});

const selectedVersion = ref<string>(productVersion);

onMounted(() => {
  if (import.meta.client) {
    updateActiveStates();
    handleMediaQueryChange();
    setTimeout(async () => {
      versions.value = await pullVersionsFromSource(versions.value, versionsSrc);
    }, 0);
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
