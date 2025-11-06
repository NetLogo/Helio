<template>
  <label
    :class="cn('xl:hidden flex flex-col gap-1 cursor-pointer transition-transform', $attrs['class'] as string)"
    role="button"
    aria-label="Toggle menu"
    v-bind="$attrs"
  >
    <span v-for="i in 3" :key="i" class="block w-[22px] h-[2px] bg-current" />
  </label>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
</script>
