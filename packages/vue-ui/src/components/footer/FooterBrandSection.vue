<template>
  <div
    :class="cn('px-1 py-2', $style['section'], $style['brandSection'])"
    :style="span ? { '--section-span': span } : {}"
    v-bind="$attrs"
  >
    <div class="flex flex-col items-start">
      <Anchor
        v-if="brand"
        :href="brandHref"
        class="flex items-center space-x-2"
        :aria-label="hrefAriaLabel || 'Homepage'"
      >
        <component :is="brand" v-if="isBrandComponent" class="h-8 w-auto" />
        <img v-else :src="brandString" alt="Brand Logo" class="h-8 w-auto" />
      </Anchor>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import Anchor from '../html/Anchor.vue'
import { cn } from '@repo/vue-ui/utils'

import type { FooterBrandSectionProps } from './types'

type Props = FooterBrandSectionProps & {}
const props = defineProps<Props>()

const isBrandComponent = typeof props.brand !== 'string'
const brandString = typeof props.brand === 'string' ? props.brand : ''
</script>

<style module src="./Footer.module.scss"></style>
