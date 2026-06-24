<template>
  <div class="flex items-center justify-end gap-2 ml-auto" data-show-from="sm">
    <UButton
      icon="i-lucide-layout-grid"
      size="sm"
      :variant="orientation === 'vertical' ? 'soft' : 'outline'"
      color="primary"
      @click="orientation = 'vertical'"
    />
    <UButton
      icon="i-lucide-layout-list"
      size="sm"
      :variant="orientation === 'horizontal' ? 'soft' : 'outline'"
      color="primary"
      @click="orientation = 'horizontal'"
    />
  </div>
</template>

<script setup lang="ts">
const orientation = defineModel<"horizontal" | "vertical">({ default: "horizontal" });
</script>
