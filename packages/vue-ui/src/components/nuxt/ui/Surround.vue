<template>
  <aside v-if="shouldRender" class="px-5 lg:px-0">
    <USeparator decorative class="my-8" />
    <UContentSurround :surround="surround" :ui="ui" />
  </aside>
</template>

<script setup lang="ts">
import type { ContentSurroundLink } from '@nuxt/ui/components/content/ContentSurround.vue.js'
import { computed } from 'vue'

const ui = {
  link: 'hover:bg-neutral hover:border-primary group',
  linkTitle: 'group-hover:text-primary',
}

const { surround } = defineProps<{
  surround: Array<ContentSurroundLink> | undefined
}>()

const shouldRender = computed(() => {
  return surround && Array.isArray(surround) && surround.filter(Boolean).length > 0
})
</script>
