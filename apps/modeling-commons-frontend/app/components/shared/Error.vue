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

const props = withDefaults(
  defineProps<{
    icon?: string;
    title?: string;
    message?: string;
    action?: ButtonProps;
    reloadOnRecovery?: boolean;
  }>(),
  {
    icon: "i-lucide-wifi-off",
    title: "Something went wrong",
    message: "We couldn't complete your request. Please try again.",
    action: () => reloadMe,
    reloadOnRecovery: true,
  },
);

const { isOffline } = useConnectionHealth();
const hasBeenOffline = ref(false);
watch(isOffline, (offline) => {
  if (props.reloadOnRecovery && hasBeenOffline.value && !offline) {
    window.location.reload();
  }
  hasBeenOffline.value ||= offline;
});
</script>

<script lang="ts">
const reloadMe: ButtonProps = {
  label: "Try again",
  onClick: () => window.location.reload(),
};
</script>
