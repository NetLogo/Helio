<template>
  <div class="flex flex-col items-center justify-center py-20 mx-auto text-center">
    <UIcon :name="icon" class="size-14 text-dimmed mx-auto mb-4" />
    <h2 class="text-lg font-semibold text-toned">{{ title }}</h2>
    <p v-if="description" class="text-dimmed mt-1">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    description?: string;
  }>(),
  {
    icon: "i-lucide-inbox",
    description: undefined
  },
);
</script>
