<template>
  <div :class="cn('sidebar-top-level', $style['sidebar-layout'])" role="application" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
</script>

<style module src="./Catalog.module.scss"></style>
