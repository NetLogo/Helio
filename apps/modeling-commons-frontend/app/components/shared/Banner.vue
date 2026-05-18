<template>
  <Transition v-bind="transitionClasses">
    <div
      v-if="visible"
      role="status"
      aria-live="polite"
      :class="bannerClass"
    >
      <div class="max-w-500 mx-auto flex items-center gap-3 px-4 py-2 text-sm">
        <UIcon v-if="icon" :name="icon" class="size-4 shrink-0" />
        <span class="flex-1">
          <slot />
        </span>
        <slot name="actions" />
        <UButton
          v-if="closable"
          size="xs"
          color="neutral"
          variant="subtle"
          icon="i-lucide-x"
          aria-label="Dismiss"
          @click="emit('close')"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'

const bannerVariants = cva(
  'sticky top-0 z-50 w-full shadow',
  {
    variants: {
      color: {
        error: 'bg-error text-inverted',
        warning: 'bg-warning text-inverted',
        info: 'bg-info text-inverted',
        success: 'bg-success text-inverted',
        neutral: 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100',
      },
      variant: {
        solid: '',
      },
    },
    defaultVariants: {
      color: 'error',
      variant: 'solid',
    },
  },
)

type BannerVariants = VariantProps<typeof bannerVariants>

interface Props {
  visible?: boolean
  color?: NonNullable<BannerVariants['color']>
  variant?: NonNullable<BannerVariants['variant']>
  icon?: string
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  color: 'error',
  variant: 'solid',
  icon: undefined,
  closable: false,
})

const emit = defineEmits<{
  close: []
}>()


const bannerClass = computed(() =>
  bannerVariants({ color: props.color, variant: props.variant }),
)


const transitionClasses = {
  enterActiveClass: 'transition duration-200 ease-out',
  enterFromClass: '-translate-y-full opacity-0',
  enterToClass: 'translate-y-0 opacity-100',
  leaveActiveClass: 'transition duration-150 ease-in',
  leaveFromClass: 'translate-y-0 opacity-100',
  leaveToClass: '-translate-y-full opacity-0',
}
</script>
