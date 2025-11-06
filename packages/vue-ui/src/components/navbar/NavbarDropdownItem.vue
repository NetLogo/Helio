<template>
  <Anchor
    :href="href"
    :class="cn(active && $style['active'])"
    v-bind="$attrs"
    role="menuitem"
    :aria-current="active ? 'page' : null"
  >
    <span v-if="icon" :class="$style['icon']">{{ icon }}</span>
    {{ title }}
  </Anchor>
</template>

<script setup lang="ts">
import type { NavLink } from './types'

import { cn } from '@repo/vue-ui/utils'
import Anchor from '../html/Anchor.vue'

type Props = NavLink & {}

defineProps<Props>()
</script>

<style module src="./Navbar.module.scss"></style>
