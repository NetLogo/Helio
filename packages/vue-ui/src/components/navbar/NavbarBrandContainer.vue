<template>
  <Anchor :href="href" :class="cn($style['brand'])" aria-label="Homepage" aria-roledescription="Navigate to Home">
    <slot />
  </Anchor>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import Anchor from '../html/Anchor.vue'

type Props = {
  href?: string
}

defineProps<Props>()
</script>

<style module src="./Navbar.module.scss"></style>
