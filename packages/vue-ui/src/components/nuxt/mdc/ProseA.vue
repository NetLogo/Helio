<template>
  <Anchor :href="href" :target="props.target" :external="external">
    <slot />
  </Anchor>
</template>

<script lang="ts">
const rewrites = [
  {
    title: 'Rewrite CCL links to archived versions',
    match: (href: string): boolean =>
      href.startsWith('https://ccl.northwestern.edu/') || href.startsWith('http://ccl.northwestern.edu/'),
    rewrite: (href: string): string => {
      return `https://web.archive.org/web/${encodeURIComponent(href)}`
    },
  },
]
</script>

<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  href: {
    type: String,
    default: '',
  },
  target: {
    type: String as PropType<'_blank' | '_parent' | '_self' | '_top' | (string & object) | null | undefined>,
    default: undefined,
    required: false,
  },
})

const external = computed(() => {
  return props.href.startsWith('http') || props.href.startsWith('//')
})

const href = computed(() =>
  rewrites.reduce((acc, rule) => {
    if (rule.match(acc)) {
      return rule.rewrite(acc)
    }
    return acc
  }, props.href)
)
</script>
