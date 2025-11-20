<template>
  <Navbar
    id="main-navbar"
    ref="navbar"
    :brand="BrandLogo"
    brand-href="/"
    class="backdrop-blur-lg! bg-white/80! border-b-2 border-primary"
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

    <NavbarActionsContainer />
  </Navbar>

  <NavbarHeightTracker navbar-selector="#main-navbar" />
</template>

<script setup lang="ts">
import BrandLogo from "@repo/vue-ui/assets/brands/NetTango-Logo.svg";
import type { Navbar as _Navbar } from "@repo/vue-ui/components/navbar/index";
import { onMounted, ref, watch } from "vue";

interface NavbarLink {
  title: string;
  href: string;
  columns?: number;
  children?: Array<Omit<NavbarLink, "children">>;
  active?: boolean;
}

const route = useRoute();

const navbarRef = useTemplateRef<InstanceType<typeof _Navbar>>("navbar");

const navbarLinks = ref<NavbarLink[]>([
  {
    title: "Home",
    href: "/",
  },
  {
    title: "NetTango Tutorial",
    href: "https://ccl.northwestern.edu/nettangoweb/tutorial/",
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

updateActiveStates();
onMounted(() => {
  if (import.meta.client) {
    updateActiveStates();
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
