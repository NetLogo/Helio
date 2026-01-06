<template>
  <component
    :is="href ? (noNuxtLink ? 'a' : Anchor) : 'button'"
    :href="href"
    :class="cn($style['action'])"
    v-bind="$attrs"
    @click="onClick"
  >
    <component :is="$slots['default']" v-if="$slots['default']" />
    {{ title }}
  </component>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import type { NavbarAction } from './types'

import { isNonEmptyString } from '@repo/utils/std/string'
import Anchor from '../html/Anchor.vue'

type Props = NavbarAction & {}

const props = defineProps<Props>()

// Validate props
if (!isNonEmptyString(props.href) && !props.onClick) {
  console.warn('NavbarAction requires either href or onClick prop.')
}
</script>

<style module src="./Navbar.module.scss"></style>
