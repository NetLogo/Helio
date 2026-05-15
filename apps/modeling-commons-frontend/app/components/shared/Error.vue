<template>
  <div :class="'text-center px-8 py-16 flex flex-col items-center justify-center'">
    <UIcon :name="icon" class="size-14 text-dimmed mx-auto mb-4" />
    <h2 class="text-toned">
      {{ title }}
    </h2>
    <p v-if="message" class="text-muted mt-1 max-w-md">
      {{ message }}
    </p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
    <div v-else-if="action" class="mt-4">
      <UButton v-bind="action">{{ action.label }}</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types";
withDefaults(
  defineProps<{
    icon?: string;
    title?: string;
    message?: string;
    action?: ButtonProps;
  }>(),
  {
    icon: "i-lucide-wifi-off",
    title: "Something went wrong",
    message: "We couldn't complete your request. Please try again.",
    action: {
      label: "Try again",
      onclick: () => window.location.reload(),
    },
  },
);
</script>
