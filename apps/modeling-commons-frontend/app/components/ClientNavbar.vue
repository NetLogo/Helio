<template>
  <Navbar
    id="main-navbar"
    ref="navbar"
    class="justify-between"
    :brand="brand"
    brand-href="/"
    :brand-attrs="brandAttrs"
  >
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

    <NavbarActionsContainer> </NavbarActionsContainer>
  </Navbar>

  <NavbarHeightTracker navbar-selector="#main-navbar" />
</template>

<script lang="ts">
import TurtlesLogo from "@repo/vue-ui/assets/brands/Turtles.svg";
import type { Navbar as _Navbar } from "@repo/vue-ui/components/navbar/index";
import { useMediaQuery } from "@vueuse/core";
import { onMounted, ref, watch } from "vue";
import { WebsiteLogo } from "~/assets/website-logo";

export interface NavbarLink {
  title: string;
  href: string;
  columns?: number;
  children?: Array<Omit<NavbarLink, "children">>;
  active?: boolean;
}

export const updateActiveStates = (
  navbarRef: Ref<InstanceType<typeof _Navbar> | null>,
  navbarLinks: Ref<Array<NavbarLink>>,
  route: ReturnType<typeof useRoute>,
) => {
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

export const arePathnamesCongruent = (
  windowPathname: string,
  candidatePathname: string,
): boolean => {
  const normalize = (pathname: string) =>
    pathname
      .split("/")
      .filter((p) => p.length > 0)
      .map((p) => p.replace(/\$/, ""))
      .map((p) => p.trim().split("#")[0] ?? "")
      .join("/");

  return normalize(windowPathname) === normalize(candidatePathname);
};

export const isSublinkActive = (href: string | undefined, currentPath: string): boolean => {
  if (typeof href !== "string") return false;
  return arePathnamesCongruent(currentPath, href);
};

export const isLinkParentActive = (link: NavbarLink, currentPath: string): boolean => {
  const isParentActiveOnItsOwn = arePathnamesCongruent(currentPath, link.href);
  return (
    isParentActiveOnItsOwn ||
    (link.children ?? []).some((child) => isSublinkActive(child.href, currentPath)) ||
    false
  );
};
</script>

<script setup lang="ts">
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

const navbarLinks = ref<Array<NavbarLink>>([
  {
    title: "Home",
    href: "/",
    columns: 2,
  },
]);

updateActiveStates(navbarRef, navbarLinks, route);

onMounted(() => {
  if (import.meta.client) {
    updateActiveStates(navbarRef, navbarLinks, route);
    handleMediaQueryChange();
  }
});

watch(
  () => route.path,
  () => {
    if (import.meta.client) {
      updateActiveStates(navbarRef, navbarLinks, route);
    }
  },
);
</script>
