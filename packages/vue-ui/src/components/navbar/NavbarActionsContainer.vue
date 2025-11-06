<template>
  <div :class="cn($style['actions'])" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
</script>

<style module src="./Navbar.module.scss"></style>
