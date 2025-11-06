<template>
  <footer
    v-if="show"
    :class="cn('w-full mt-5 px-4 py-0', 'bg-gray-50 border-t border-gray-200', $style['footer'])"
    :style="{
      '--section-span': 12 / sections,
    }"
    aria-label="Footer"
    v-bind="$attrs"
  >
    <slot />
  </footer>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import type { FooterProps } from './types'

type Props = FooterProps & {}

withDefaults(defineProps<Props>(), {
  sections: 3,
  show: true,
})
</script>

<style module src="./Footer.module.scss"></style>
