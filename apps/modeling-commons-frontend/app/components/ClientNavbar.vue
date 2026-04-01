<template>
  <Navbar
    id="main-navbar"
    ref="navbar"
    class="backdrop-blur-lg! bg-white/80! border-b-2 border-secondary md:px-[calc((100vw-var(--max-width-ch))/2)]!"
    :brand="brand"
    brand-href="/"
    :brand-attrs="brandAttrs"
  >
    <NavbarLinksContainer class="flex-1 mx-auto">
      <NavbarItem
        v-for="link in navbarLinks"
        :key="link.title"
        :title="link.title"
        :href="link.href"
        :columns="link.columns"
        :active="link.active"
        :icon="link.icon"
      >
        <template v-if="link.children && link.children.length > 0">
          <NavbarDropdownItem
            v-for="child in link.children"
            :key="child.title"
            :title="child.title"
            :href="child.href"
            :active="child.active"
            :icon="child.icon"
          />
        </template>
      </NavbarItem>
    </NavbarLinksContainer>

    <NavbarActionsContainer>
      <UDropdownMenu v-if="user.isLoggedIn" :items="userDropdownItems" :modal="false">
        <UAvatar
          :name="user.name"
          :image="user.image"
          :alt="user.name"
          class="cursor-pointer hover:ring-2 hover:ring-primary rounded-full"
        />
      </UDropdownMenu>
      <UButton v-else variant="solid" size="md" class="px-3" to="/login"> Sign in </UButton>
    </NavbarActionsContainer>
  </Navbar>

  <NavbarHeightTracker navbar-selector="#main-navbar" />
</template>

<script lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import TurtlesLogo from "@repo/vue-ui/assets/brands/Turtles.svg";
import type { Navbar as _Navbar } from "@repo/vue-ui/components/navbar/index";
import { useMediaQuery } from "@vueuse/core";
import { onMounted, ref, watch } from "vue";
import { WebsiteLogo } from "~/assets/website-logo";

export interface NavbarLink {
  title: string;
  href: string;
  icon?: string;
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
const auth = useNuxtApp().$auth;
const user = useUser();

const userDropdownItems = computed<Array<Array<DropdownMenuItem>>>(() => {
  if (user.value.isLoggedIn) {
    return [
      [
        {
          label: user.value.name,
          avatar: { src: user.value.image ?? undefined, lazy: true, alt: user.value.name },
          type: "label",
        },
      ],
      [
        {
          label: "Profile",
          icon: "i-lucide-user",
        },
        {
          label: "Settings",
          icon: "i-lucide-settings",
        },
      ],
      [
        {
          label: "Sign out",
          icon: "i-lucide-log-out",
          color: "error",
          onClick: async () => {
            await auth.client.signOut();
            navigateTo("/login");
          },
        },
      ],
      [
        {
          label: "Admin Dashboard",
          icon: "i-lucide-shield-check",
          href: "/admin",
          visible: true,
          color: "primary",
        },
      ],
    ];
  }
  return [];
});


const isMobileScreen = ref(false);
const navbarRef = useTemplateRef<InstanceType<typeof _Navbar>>("navbar");

const brand = computed(() => (isMobileScreen.value ? TurtlesLogo : WebsiteLogo));
const brandAttrs = computed(() =>
  isMobileScreen.value
    ? { style: { width: "2rem" } }
    : { width: "15rem", style: { width: "15rem", marginLeft: "1rem" }, class: "[&>svg]:w-full!" },
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
    columns: 2
  },
  {
    title: "Explore Models",
    href: "/models",
    columns: 2,
    children: [
      { title: "All Models", href: "/models", icon: "i-lucide-box" },
      { title: "My Models", href: "/profile/models", icon: "i-lucide-user" },
      { title: "Featured Models", href: "/featured-models", icon: "i-lucide-star" },
      { title: "New Models", href: "/new-models", icon: "i-lucide-plus" },
      { title: "Models by Tag", href: "/models/tags", icon: "i-lucide-tag" },
    ],
  }
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
