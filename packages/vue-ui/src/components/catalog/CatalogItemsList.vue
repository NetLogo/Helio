<template>
  <ul :class="cn($style['heading-items'])" v-bind="$attrs" aria-label="Items List">
    <!-- Loading state -->
    <li v-if="isLoading" class="pointer-events-none italic mx-auto w-full">
      <a v-for="i in 10" :key="i" class="bg-red-400 w-full block my-2 ml-2 animate-pulse animate-shimmer">
        <span class="opacity-0">Loading...</span>
      </a>
    </li>

    <!-- Empty state -->
    <li v-else-if="items.length === 0" class="pointer-events-none italic text-center">No items found</li>

    <!-- Items -->
    <CatalogItem
      v-for="item in items"
      v-else
      :key="`${item.title}-${item.url ?? 'NOURL'}`"
      :item="item"
      :active="isSelected ? isSelected(item) : false"
      :on-select="onSelect"
    />
  </ul>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import type { ItemsListProps } from './types'

import CatalogItem from './CatalogItem.vue'

type Props = ItemsListProps & {}

withDefaults(defineProps<Props>(), {
  isLoading: false,
})
</script>

<style module src="./Catalog.module.scss"></style>
