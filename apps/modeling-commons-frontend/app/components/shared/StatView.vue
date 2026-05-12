<template>
  <div class="flex items-center gap-1.5">
    <UIcon :name="icon" class="size-4" />
    <span class="font-medium">{{ numberFormatter.format(count) }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  count: number;
}>();
</script>
