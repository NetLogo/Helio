<template>
  <div
    :class="cn('lg:col-span-5 px-1 py-2', $style['section'])"
    :style="span ? { '--section-span': span } : {}"
    v-bind="$attrs"
  >
    <div class="text-gray-700 space-y-3">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import type { FooterSectionProps } from './types'

type Props = FooterSectionProps & {}

defineProps<Props>()
</script>

<style module src="./Footer.module.scss"></style>
