<script setup lang="ts">
import type { DropdownMenuItemProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'

import { cn } from '@repo/vue-ui/utils'
import { cva } from 'class-variance-authority'
import { DropdownMenuItem, useForwardProps } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<
  DropdownMenuItemProps & {
    class?: HTMLAttributes['class']
    inset?: boolean
    variant?: 'default' | 'destructive' | 'disabled' | 'selected'
  }
>()

const delegatedProps = computed(() => {
  const { class: _, variant: _1, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)

const itemVariants = cva(
  'relative flex cursor-default select-none items-center rounded-sm gap-2 px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50  [&>svg]:size-4 [&>svg]:shrink-0',
  {
    defaultVariants: {
      inset: false,
      variant: 'default',
    },
    variants: {
      inset: {
        false: '',
        true: 'pl-8',
      },
      variant: {
        default: '',
        destructive: 'text-destructive hover:bg-destructive hover:text-destructive-foreground',
        disabled: 'text-muted-foreground pointer-events-none opacity-50',
        selected: 'bg-accent text-accent-foreground',
      },
    },
  }
)
</script>

<template>
  <DropdownMenuItem
    v-bind="forwardedProps"
    :data-slot="'dropdown-menu-item'"
    :data-inset="props.inset"
    :data-variant="props.variant"
    :class="cn(itemVariants({ variant: props.variant, inset: props.inset }), props.class)"
  >
    <slot />
  </DropdownMenuItem>
</template>
