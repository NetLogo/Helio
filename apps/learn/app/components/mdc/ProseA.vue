<template>
  <Anchor :href="props.href" :target="props.target" :external="external">
    <slot />
  </Anchor>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

const props = defineProps({
  href: {
    type: String,
    default: '',
  },
  target: {
    type: String as PropType<'_blank' | '_parent' | '_self' | '_top' | (string & object) | null | undefined>,
    default: undefined,
    required: false,
  },
});

const external = computed(() => {
  return props.href.startsWith('http') || props.href.startsWith('//');
});
</script>
