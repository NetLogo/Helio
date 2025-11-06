<template>
  <div :class="cn('px-1 py-2', $style['section'])" :style="span ? { '--section-span': span } : {}" v-bind="$attrs">
    <div>
      <h5 class="mt-0 mb-4 text-lg font-semibold text-gray-900">
        {{ title }}
      </h5>
      <ul class="space-y-2 list-disc">
        <FooterLink v-for="(link, index) in links" :key="index" v-bind="link" />
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import type { FooterLinksSectionProps } from './types'

import FooterLink from './FooterLink.vue'

type Props = FooterLinksSectionProps & {}

defineProps<Props>()
</script>

<style module src="./Footer.module.scss"></style>
