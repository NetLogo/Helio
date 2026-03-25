<template>
  <Anchor :href="href" :target="props.target" :external="external">
    <slot />
  </Anchor>
</template>

<script lang="ts">
type RewriteRule = {
  title: string
  match: (href: string) => boolean
  rewrite: (href: string) => string
}
</script>

<script setup lang="ts">
import type { PropType } from 'vue'

const {
  public: {
    website: { productWebsite },
  },
} = useRuntimeConfig()

const rewrites: Array<RewriteRule> = [
  {
    title: 'no-absolute-site-urls',
    match: (href) => href.startsWith(productWebsite as string),
    rewrite: (href) => href.replace((productWebsite as string).replace(/\/$/, ''), ''),
  },
]

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
