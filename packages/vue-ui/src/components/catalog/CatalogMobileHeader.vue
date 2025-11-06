<template>
  <div :class="cn($style['heading-section'], $style['sidebar-folded'])">
    <Hamburger :class="cn($style['hamburger'])" @click="handleToggle" />
    <CatalogActiveItem :selected-item-label="selectedItemLabel" :item-prefix="itemPrefix" />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
import { inject } from 'vue'

import Hamburger from '../Hamburger.vue'
import CatalogActiveItem from './CatalogActiveItem.vue'

type Props = {
  itemPrefix?: string
  selectedItemLabel?: string
}

defineProps<Props>()

const toggle: (() => void) | undefined = inject('catalogToggle')

const handleToggle = (): void => {
  toggle?.()
}
</script>

<style module src="./Catalog.module.scss"></style>
