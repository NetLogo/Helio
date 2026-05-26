<template>
  <Navbar
    id="main-navbar"
    ref="navbar"
    class="bg-background! py-4! lg:px-[2.5vw]! shadow-none! max-w-500 mx-auto flex-1 w-full"
    :brand="brand"
    brand-href="/"
    :brand-attrs="brandAttrs"
  >
    <NavbarLinksContainer class="lg:mx-auto flex-none!">
      <NavbarItem
        v-for="link in navbarLinks"
        :key="link.title"
        :title="link.title"
        :href="link.href"
        :columns="link.columns"
        :active="link.active"
        :icon="link.icon"
        class="rounded-md transition-colors"
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
      <!-- <SearchBar class="w-xl" /> -->
    </NavbarLinksContainer>

    <NavbarActionsContainer class="gap-3! ml-0!">
      <NuxtLink v-if="user.isLoggedIn" to="/models/upload" title="Upload a Model">
        <UButton variant="outline" size="xs" square icon="i-lucide-upload" />
      </NuxtLink>
      <UDropdownMenu v-if="user.isLoggedIn" :items="userDropdownItems" :content="{ align: 'end' }">
        <template #user-info>
          <UserAvatar
            :name="user.name"
            :src="user.image"
            :alt="user.name"
            :email="user.email"
            variant="headline"
          />
        </template>
        <template #default="{ open }">
          <div
            class="group hover:cursor-pointer flex gap-2 items-center p-1 hover:bg-neutral-lighter/30 rounded-full"
            :class="{ 'bg-neutral-lighter/30': open }"
          >
            <UserAvatar
              :name="user.name"
              :src="user.image"
              :alt="user.name"
              size="sm"
              class="rounded-full bg-neutral-lighter"
            />
            <UIcon
              name="i-lucide-chevron-down"
              class="text-muted group-hover:text-toned transition-transform"
              :class="{ 'rotate-180': open }"
            />
          </div>
        </template>
      </UDropdownMenu>
      <div v-else class="flex gap-5">
        <UButton data-show-from="lg" variant="link" size="xs" to="/login"> Log In </UButton>
        <UButton variant="solid" size="xs" to="/signup"> Sign Up </UButton>
      </div>
    </NavbarActionsContainer>
  </Navbar>

  <NavbarHeightTracker navbar-selector="#main-navbar" />
</template>

<script lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
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
const router = useRouter();
const { signOut } = useAuthActions();
const user = useUser();

const userDropdownItems = computed<Array<Array<DropdownMenuItem>>>(() => {
  if (user.value.isLoggedIn) {
    return [
      [
        {
          slot: "user-info",
        },
      ],
      [
        {
          label: "Profile",
          icon: "i-lucide-user",
          href: "/profile",
        },
      ],
      [
        {
          label: "Settings",
          icon: "i-lucide-settings",
          href: "/profile/settings",
        },
        {
          label: "Login & Security",
          icon: "i-lucide-key-round",
          href: "/profile/security",
        },
      ],
      [
        {
          label: "Sign out",
          icon: "i-lucide-log-out",
          class: "font-semibold cursor-pointer",
          onClick: async () => {
            await signOut();
            router.push("/");
          },
        },
      ],
    ] satisfies DropdownMenuItem[];
  }
  return [];
});

const isMobileScreen = ref(false);
const navbarRef = useTemplateRef<InstanceType<typeof _Navbar>>("navbar");

const brand = computed(() => WebsiteLogo);
const brandAttrs = computed(() => ({ class: "w-40 lg:w-48 lg:ml-0 lg:[&>svg]:w-full!" }));

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
  {
    title: "Models",
    href: "/models",
    columns: 1,
    children: [
      { title: "All Models", href: "/models", icon: "i-lucide-box" },
      { title: "Featured Models", href: "/featured-models", icon: "i-lucide-star" },
      { title: "New Models", href: "/new-models", icon: "i-lucide-circle-plus" },
      { title: "Models by Tag", href: "/tags", icon: "i-lucide-tag" },
    ],
  },
  {
    title: "About",
    href: "/about",
  },
  {
    title: "Donate",
    href: "/donate",
    icon: "i-lucide-heart",
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
