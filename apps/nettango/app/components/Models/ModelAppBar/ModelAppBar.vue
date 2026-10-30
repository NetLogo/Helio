<template>
  <header class="flex h-12 shrink-0 items-center gap-2 border-b-2 border-primary bg-default px-3">
    <NuxtLink
      to="/"
      aria-label="NetTango home"
      class="me-1 shrink-0 rounded-sm"
    >
      <BrandLogo class="h-6 w-auto max-md:hidden" />
      <BrandLogo class="size-6 md:hidden" viewBox="0 0 122 122" />
    </NuxtLink>

    <template v-if="model && nav">
      <ModelMenu :items="menuItems" />

      <USeparator orientation="vertical" class="h-5" />

      <UBreadcrumb :items="trail" class="min-w-0 flex-1 max-sm:hidden" :ui="{ list: 'm-0' }" />
      <p class="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted sm:hidden">{{ model.title }}</p>

      <StepNav
        v-if="nav.sequence && stepLinks"
        :title="nav.sequence.title"
        :step="nav.sequence.step"
        :total="nav.sequence.total"
        :links="stepLinks"
      />

      <ViewControls
        :student-mode="studentMode"
        :sidebar-label="sidebarLabel"
        :sidebar-visible="sidebarVisible"
        :sidebar-icons="sidebarIcons"
        :swapped="swapped"
        @toggle-sidebar="emit('toggleSidebar')"
        @swap="emit('swap')"
        @reset-split="emit('resetSplit')"
      />

      <UDropdownMenu :items="overflowItems" :content="{ align: 'end' }" :ui="{ item: 'font-normal' }" class="sm:hidden">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-ellipsis-vertical"
          aria-label="More"
          class="ms-auto shrink-0 sm:hidden"
        />
      </UDropdownMenu>
    </template>
  </header>
</template>

<script setup lang="ts">
import BrandLogo from "@repo/vue-ui/assets/brands/NetTango-Logo-Flat.svg";
import type { GalleryModel } from "~/composables/useModels";

const props = defineProps<{
  model?: GalleryModel;
  sidebarVisible: boolean;
  sidebarIcons: { desktop: string; compact: string };
  swapped: boolean;
  studentMode?: boolean;
}>();

const emit = defineEmits<{ toggleSidebar: []; swap: []; resetSplit: [] }>();

const { nav, sidebarLabel, menuItems, trail, stepLinks, overflowItems } = useModelAppBar(props, {
  toggleSidebar: () => emit("toggleSidebar"),
  swap: () => emit("swap"),
});
</script>
