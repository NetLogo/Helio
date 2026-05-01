<template>
  <div class="flex flex-col">
    <ClientNavbar />

    <PageBoundary>
      <UContainer class="flex py-5 max-w-[130ch] gap-8">
        <div class="flex flex-col gap-6 px-4 py-6 min-w-80">
          <div
            class="flex items-center gap-3 px-1 py-1 group-data-[collapsible=icon]:justify-center"
          >
            <UAvatar
              :src="displayImage || undefined"
              :alt="displayName"
              size="md"
              :ui="{ fallback: 'font-semibold' }"
            >
              {{ initials }}
            </UAvatar>
            <div class="min-w-0 group-data-[collapsible=icon]:hidden">
              <p class="truncate text-sm font-semibold mb-0">{{ displayName }}</p>
              <p class="truncate text-xs text-muted">{{ displayEmail }}</p>
            </div>
          </div>

          <UNavigationMenu
            :items="navItems"
            orientation="vertical"
            :collapsed="!sidebarOpen"
            class="data-[orientation=vertical]:w-full lg:flex-1 overflow-auto"
          />
        </div>

        <div class="flex flex-col gap-2 flex-1">
          <header class="sticky top-0 z-10 flex h-14 items-center gap-2 mt-10">
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

const initials = computed(
  () =>
    displayName.value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U",
);

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
