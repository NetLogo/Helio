<template>
  <div class="contents">
    <UButton v-bind="buttonProps" data-show-from="sm" @click="$emit('toggle')">
      <span>{{ buttonText }}</span>
    </UButton>
    <UButton v-bind="buttonProps" data-show-below="sm" @click="$emit('toggle')" />
  </div>
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types";

const props = defineProps<{
  active: boolean;
  busy?: boolean;
}>();

defineEmits<{
  toggle: [];
}>();

const buttonText = computed(() => (props.active ? "Liked" : "Like"));
const buttonProps = computed<ButtonProps>(() => ({
  variant: props.active ? "solid" : "outline",
  color: props.active ? "primary" : "neutral",
  size: "sm",
  icon: "i-lucide-thumbs-up",
  disabled: props.busy,
  title: buttonText.value,
}));
</script>
