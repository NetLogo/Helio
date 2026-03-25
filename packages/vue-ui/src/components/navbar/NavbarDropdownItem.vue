<template>
  <Anchor
    :href="href"
    :class="cn(active && $style['active'])"
    v-bind="$attrs"
    role="menuitem"
    :aria-current="active ? 'page' : null"
  >
    <template v-if="icon">
      <div class="flex gap-2 items-center">
        <Icon :class="[$style['icon'], 'align-middle']" :name="icon" />
        <span>{{ title }}</span>
      </div>
    </template>
    <template v-else>
      {{ title }}
    </template>
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
