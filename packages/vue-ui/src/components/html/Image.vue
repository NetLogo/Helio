<template>
  <img v-bind="$attrs" ref="imgRef" :src="src" :src-set="srcSet" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { applyBasePath } from '../../lib/href'

const props = defineProps<{
  src?: string
  srcSet?: string
}>()

const src = computed(() => applyBasePath(props.src))
const srcSet = computed(() =>
  props.srcSet
    ?.split(',')
    .map((src0) => applyBasePath(src0))
    .join(', ')
)
</script>
