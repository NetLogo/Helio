<template>
  <div :class="className" />
</template>

<script lang="ts" setup>
import { cn } from '@repo/vue-ui/utils';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{ class?: string }>(), {
  class: "",
});
const className = computed(() => {
  return cn("absolute -left-1/2 -translate-x-9 top-3 w-full z-2 bg-background h-[calc(100%-1rem)]", props.class);
});
</script>