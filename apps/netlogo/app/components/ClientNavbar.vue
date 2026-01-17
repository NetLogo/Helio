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
      <Button variant="default" size="sm" class="text-sm px-4 py-2" @click="navigateToDonate">
        DONATE
      </Button>
    </NavbarActionsContainer>
  </Navbar>

  <NavbarHeightTracker navbar-selector="#main-navbar" />
</template>

<script setup lang="ts">
import TurtlesLogo from "@repo/vue-ui/assets/brands/Turtles.svg";
import type { Navbar as _Navbar } from "@repo/vue-ui/components/navbar/index";
import { useMediaQuery } from "@vueuse/core";
import { onMounted, ref, watch } from "vue";
import { WebsiteLogo } from "~/assets/website-logo";
import { useNavigation, type NavbarLink } from "~/composables/useNavigation";

const route = useRoute();

const isMobileScreen = ref(false);
const navbarRef = useTemplateRef<InstanceType<typeof _Navbar>>("navbar");

const brand = computed(() => (isMobileScreen.value ? TurtlesLogo : WebsiteLogo));
const brandAttrs = computed(() =>
  isMobileScreen.value
    ? { style: { width: "2rem" } }
    : { width: "auto", style: { marginLeft: "1rem" } },
);

const handleMediaQueryChange = (): void => {
  if (import.meta.client) {
    const mediaQuery = useMediaQuery("(max-width: 768px)");
    watch(
      mediaQuery,
      (value) => {
        isMobileScreen.value = value;
      },
      { immediate: true },
    );
  }
};

// Use the navigation composable to fetch from Directus
const { navbarLinks: apiNavbarLinks, fetchNavigation, isLoading } = useNavigation();

// Default fallback navigation (shown while loading or on error)
const defaultNavbarLinks: NavbarLink[] = [
  {
    title: "Home",
    href: "/",
  },
];

// Reactive navbar links that update once API data is loaded
const navbarLinks = ref<NavbarLink[]>(defaultNavbarLinks);

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
      .split("/")
      .filter((p) => p.length > 0)
      .map((p) => p.replace(/\$/, ""))
      .map((p) => p.trim().split("#")[0] ?? "")
      .join("/");

  return normalize(windowPathname) === normalize(candidatePathname);
};

const isSublinkActive = (href: string | undefined, currentPath: string): boolean => {
  if (typeof href !== "string") return false;
  return arePathnamesCongruent(currentPath, href);
};

const isLinkParentActive = (link: NavbarLink, currentPath: string): boolean => {
  const isParentActiveOnItsOwn = arePathnamesCongruent(currentPath, link.href);
  return (
    isParentActiveOnItsOwn ||
    (link.children ?? []).some((child) => isSublinkActive(child.href, currentPath)) ||
    false
  );
};

// Watch for API data to load and update navbarLinks
watch(
  apiNavbarLinks,
  (newLinks) => {
    if (newLinks.length > 0) {
      navbarLinks.value = newLinks;
      updateActiveStates();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (import.meta.client) {
    // Fetch navigation data from Directus
    await fetchNavigation();
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
