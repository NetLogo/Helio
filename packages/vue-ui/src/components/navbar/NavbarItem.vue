<template>
  <div
    :class="cn($style['item'], active && $style['active'])"
    v-bind="$attrs"
    role="menuitem"
    :aria-label="title"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @keydown.space.prevent="dropdownOpen = !dropdownOpen"
    @keydown.arrow-down.prevent="dropdownOpen = true"
    @keydown.arrow-up.prevent="dropdownOpen = false"
    @keydown.esc.capture="dropdownOpen = false"
    @blur="dropdownOpen = false"
  >
    <Anchor :href="href">
      <Icon v-if="icon" :class="$style['icon']" :name="icon"/>
      {{ title }}
    </Anchor>
    <div
      v-if="hasChildren"
      role="menu"
      :aria-expanded="dropdownOpen"
      aria-label="dropdown"
      :class="cn($style['dropdown'], dropdownOpen && $style['open'])"
      :style="{ '--columns': columns }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
import { ref, useSlots } from 'vue'

import type { NavbarMenu } from './types'

import Anchor from '../html/Anchor.vue'

type Props = NavbarMenu & {}

const props = withDefaults(defineProps<Props>(), {
  columns: 1,
  dropdownOpen: false,
})

const slots = useSlots()
const slotContent = slots['default']?.()
const hasChildren = Boolean(slotContent) && slotContent?.some((v: { key?: unknown }) => v.key !== null)

const dropdownOpen = ref(props.dropdownOpen)
let hoverTimeout: null | ReturnType<typeof setTimeout> = null

const onMouseEnter = (): void => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }
  dropdownOpen.value = true
}

const onMouseLeave = (): void => {
  hoverTimeout = setTimeout(() => {
    dropdownOpen.value = false
  }, 150)
}

const route = useRoute()
watch(
  () => route.path,
  () => {
    dropdownOpen.value = false
  }
)
</script>

<style module src="./Navbar.module.scss"></style>
