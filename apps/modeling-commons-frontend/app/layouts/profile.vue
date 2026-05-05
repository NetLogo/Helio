<template>
  <div class="flex flex-col">
    <ClientNavbar />

    <PageBoundary>
      <UContainer class="flex py-5 lg:max-w-[130ch] gap-3 lg:gap-8 relative">
        <div
          class="flex flex-col gap-6 px-2 py-1 lg:px-4 lg:py-6 lg:min-w-80 sticky lg:static top-(--ui-header-height) self-start"
        >
          <UserAvatar
            :src="displayImage"
            :name="displayName"
            :email="displayEmail"
            :alt="displayName"
            size="md"
            container="hidden lg:block"
            :ui="{ fallback: 'font-semibold' }"
            variant="headline"
          />

          <UNavigationMenu
            :items="navItems"
            orientation="vertical"
            :collapsed="!sidebarOpen"
            class="hidden lg:block data-[orientation=vertical]:w-full flex-1 overflow-auto"
            :ui="{
              separator: 'my-2',
            }"
          />
          <UNavigationMenu
            :items="navItems"
            orientation="vertical"
            :collapsed="sidebarOpen"
            class="lg:hidden grow-0 w-fit overflow-auto"
            :ui="{
              link: 'p-3 m-1 w-fit',
            }"
          />
        </div>

        <div class="flex flex-col gap-2 flex-1">
          <header class="sticky top-0 z-10 flex h-14 items-center gap-2 lg:mt-10">
            <h5 class="mb-0">{{ activeTitle }}</h5>
          </header>
          <USeparator />

          <main class="flex-1">
            <slot />
          </main>
        </div>
      </UContainer>
    </PageBoundary>

    <ClientFooter />
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const meta = useWebsite();
const pageProductName = meta.value.name;

useHead({
  titleTemplate: (chunk) => (chunk ? `${chunk} - ${pageProductName}` : pageProductName),
});

const { displayName, displayEmail, displayImage } = useProfileSettings();

const sidebarOpen = ref(true);

const navItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: "Account", type: "label" },
    { label: "Public Profile", icon: "i-lucide-user-cog", to: "/profile/settings" },
    { label: "Login & Security", icon: "i-lucide-key-round", to: "/profile/security" },
    {
      label: "Notifications & Preferences",
      icon: "i-lucide-sliders-horizontal",
      to: "/profile/preferences",
    },
  ],
  [
    { label: "Models", type: "label" },
    { label: "Published", icon: "i-lucide-globe", to: "/profile/models" },
    { label: "Drafts", icon: "i-lucide-file-edit", to: "/profile/drafts" },
    { label: "Saved", icon: "i-lucide-heart", to: "/profile/saved" },
  ],
  [
    { label: "Support", type: "label" },
    { label: "Help Center", icon: "i-lucide-help-circle", to: "/profile/support" },
  ],
  [
    { label: "Legal & Policies", type: "label" },
    { label: "Privacy Policy", icon: "i-lucide-eye-closed", to: "/privacy", target: "_blank" },
    {
      label: "Terms of Service",
      icon: "i-lucide-handshake",
      to: "/terms-of-service",
      target: "_blank",
    },
    { label: "Cookie Policy", icon: "i-lucide-cookie", to: "/cookies", target: "_blank" },
  ],
  [{ label: "Go to My Profile", icon: "i-lucide-user", to: "/profile", target: "_blank" }],
]);

const route = useRoute();
const activeTitle = computed(() => {
  const flat = navItems.value.flat();
  const match = flat
    .filter((i) => typeof i.to === "string")
    .sort((a, b) => (b.to as string).length - (a.to as string).length)
    .find((i) => route.path === i.to || route.path.startsWith(`${i.to as string}/`));
  return match?.label ?? "Profile";
});
</script>
