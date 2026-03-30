<template>
  <div :class="cn($style['menus'])">
    <div :class="$style['links']" v-bind="$attrs">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
</script>

<style module src="./Navbar.module.scss"></style>
