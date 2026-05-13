<template>
  <div>
    <component :is="heading" class="tracking-tight">{{ title }}</component>
    <p v-if="subtitle" class="text-sm text-muted mt-1">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    heading?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  }>(),
  {
    heading: "h5",
    subtitle: undefined,
  },
);
</script>
