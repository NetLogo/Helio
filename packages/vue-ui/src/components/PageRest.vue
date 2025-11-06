<template>
  <div :class="classes" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    offsetTop?: boolean
    setMinHeight?: boolean
    setHeight?: boolean
  }>(),
  {
    offsetTop: false,
    setMinHeight: true,
    setHeight: false,
  }
)

const classes = computed(() => {
  return [props.offsetTop ? 'offset-top' : '', props.setMinHeight ? 'min-h-rest' : '', props.setHeight ? 'h-rest' : '']
})
</script>

<style lang="css" scoped>
.offset-top {
  margin-top: var(--ui-header-height);
}
.min-h-rest {
  min-height: calc(100vh - var(--ui-header-height));
}
.h-rest {
  height: calc(100vh - var(--ui-header-height));
}
</style>
