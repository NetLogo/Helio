<template>
  <span v-if="asText">{{ pluralize(count, label) }}</span>
  <div v-else class="flex items-center gap-1.5">
    <UIcon :name="icon" class="size-4" />
    <span class="font-medium">{{ numberFormatter.format(count) }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string;
    count: number;
    asText?: boolean;
    label?: string;
  }>(),
  {
    asText: false,
    label: "",
  },
);
</script>
