<script setup lang="ts">
import type { UInput } from "#components";

const input = useTemplateRef("input");

defineShortcuts({
  meta_k: () => {
    if (import.meta.client) {
      document.documentElement.style.scrollBehavior = "smooth";
      input.value?.inputRef?.focus();
      document.documentElement.style.scrollBehavior = "";
    }
  },
});
</script>

<template>
  <UInput
    ref="input"
    placeholder="Discover 1,000+ models across subjects..."
    icon="i-lucide-search"
  >
    <template #trailing>
      <UKbd value="meta" />
      <UKbd value="K" />
    </template>
  </UInput>
</template>
