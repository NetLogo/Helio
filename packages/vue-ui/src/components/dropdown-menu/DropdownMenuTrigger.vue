<script setup lang="ts">
import type { DropdownMenuTriggerProps } from 'radix-vue'

import { cn } from '@repo/vue-ui/utils'
import { DropdownMenuTrigger, useForwardProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'

const props = defineProps<DropdownMenuTriggerProps & { class?: HTMLAttributes['class'] }>()

const forwardedProps = useForwardProps(props)
</script>

<template>
  <DropdownMenuTrigger
    v-bind="forwardedProps"
    :class="
      cn(
        'outline-none px-4 py-1 cursor-pointer bg-nav-text hover:bg-brand text-white rounded-sm focus-visible:outline-none w-fit',
        props['class']
      )
    "
  >
    <slot />
  </DropdownMenuTrigger>
</template>
