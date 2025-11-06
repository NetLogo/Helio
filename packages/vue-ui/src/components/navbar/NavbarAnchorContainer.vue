<template>
  <div :class="cn($style['anchor'])" v-bind="$attrs">
    <label :class="$style['hamburger']" :for="id + '-toggle'">
      <span />
      <span />
      <span />
    </label>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

type Props = {
  id: string
}

defineProps<Props>()
</script>

<style module src="./Navbar.module.scss"></style>
