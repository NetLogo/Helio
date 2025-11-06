<template>
  <li :title="item.title" :aria-label="item.title" v-bind="$attrs">
    <NuxtLink :to="item.url" :class="cn(active && $style['active'])" @click="handleClick">
      {{ item.title }}
    </NuxtLink>
  </li>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import type { CatalogItemProps } from './types'

type Props = CatalogItemProps & {}

const props = withDefaults(defineProps<Props>(), {
  active: false,
})

const handleClick = (event: Event): void => {
  props.onSelect?.(props.item, event)
}
</script>

<style module src="./Catalog.module.scss"></style>
