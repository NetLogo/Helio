<template>
  <div :class="cn($style['heading-sticky'])" role="heading" aria-label="Catalog Header" v-bind="$attrs">
    <span :class="$style['heading-title']">{{ title }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import type { HeaderSectionProps } from './types'

type Props = HeaderSectionProps & {}

defineProps<Props>()
</script>

<style module src="./Catalog.module.scss"></style>
