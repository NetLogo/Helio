<template>
  <UBlogPost :badges="[]" :authors="[]" class="animate-pulse" :orientation="orientation">
    <template #header>
      <div class="w-full h-full bg-muted animate-pulse" />
    </template>
  </UBlogPost>
</template>

<script setup lang="ts">
defineProps<{
  orientation?: "horizontal" | "vertical";
}>();
</script>
