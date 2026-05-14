<template>
  <div
    class="rounded-xl p-8 text-center bg-error-50 border border-error-500 flex flex-col items-center justify-center"
  >
    <UIcon :name="icon" class="size-10 text-error-400 mx-auto mb-3" />
    <p class="text-error-700 font-medium mb-3">{{ title }}</p>
    <p v-if="message" class="text-sm text-error-600 mt-1 text-center mx-auto max-w-xl">
      {{ message }}
    </p>
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
    message?: string;
  }>(),
  {
    icon: "i-lucide-wifi-off",
  },
);
</script>
