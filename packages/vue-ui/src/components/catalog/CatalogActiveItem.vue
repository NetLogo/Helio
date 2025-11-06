<template>
  <div :class="cn($style['active-item'])" v-bind="$attrs">
    <span :class="$style['active-item-name']">
      <i v-if="itemPrefix">{{ itemPrefix }} </i>
      {{ selectedItemLabel ?? '' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

type Props = {
  selectedItemLabel?: string
  itemPrefix?: string
}

defineProps<Props>()
</script>

<style module src="./Catalog.module.scss"></style>
