<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'start', collisionPadding: 8 }"
    :ui="{ content: 'w-72 max-h-(--reka-dropdown-menu-content-available-height)', item: 'font-normal' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-layout-grid"
      trailing-icon="i-lucide-chevron-down"
      label="Models"
      class="shrink-0"
    />
    <template #current-trailing>
      <UIcon name="i-lucide-check" class="size-4 shrink-0 text-primary" />
      <span class="sr-only">(current model)</span>
    </template>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{ items: DropdownMenuItem[][] }>();
</script>
