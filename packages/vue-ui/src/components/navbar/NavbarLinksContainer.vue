<template>
  <div :class="cn($style['menus'])" v-bind="$attrs">
    <div :class="$style['links']">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
</script>

<style module src="./Navbar.module.scss"></style>
