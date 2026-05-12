<template>
  <Empty :title="title" :description="description">
    <UButton v-if="resettable" variant="outline" @click="$emit('resetFilters')">
      Clear filters
    </UButton>
  </Empty>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    resettable?: boolean;
  }>(),
  {
    title: "No models found",
    description: "Try adjusting your search or filters.",
    resettable: false,
  },
);

defineEmits<{ resetFilters: [] }>();
</script>
