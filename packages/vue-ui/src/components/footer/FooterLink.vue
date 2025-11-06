<template>
  <li>
    <Anchor :href="href" :external="external" v-bind="$attrs">
      {{ title }}
    </Anchor>
  </li>
</template>

<script setup lang="ts">
import Anchor from '../html/Anchor.vue'

import type { FooterLink } from './types'

type Props = FooterLink & {}

withDefaults(defineProps<Props>(), {
  external: false,
})
</script>
