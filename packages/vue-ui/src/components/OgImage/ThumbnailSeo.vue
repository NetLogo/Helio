<script setup lang="ts">
import { useSiteConfig } from '#site-config/app/composables'
import { isNonEmptyString } from '@repo/utils/std/string'
import { computed } from 'vue'

// convert to typescript props
const props = withDefaults(
  defineProps<{
    thumbnailUrl?: string
    title?: string
    description?: string
    siteName?: string
    siteLogo?: string
    theme?: string
  }>(),
  {
    thumbnailUrl: undefined,
    siteLogo: undefined,
    siteName: undefined,
    title: 'title',
    description: undefined,
    theme: '#00dc82',
  }
)

const siteConfig = useSiteConfig()
const siteName = computed<string | undefined>(() => {
  return props.siteName ?? (isNonEmptyString(siteConfig.name) ? siteConfig.name : undefined)
})
const siteLogo = computed<string | undefined>(() => {
  return props.siteLogo ?? (isNonEmptyString(siteConfig['logo']) ? siteConfig['logo'] : undefined)
})
</script>

<template>
  <div :src="thumbnailUrl" class="w-full h-full flex justify-between relative">
    <!-- Background is the thumbnail -->
    <img
      class="absolute top-0 left-0 w-full h-full opacity-20 object-cover"
      :src="thumbnailUrl"
      :style="`background: linear-gradient(135deg, ${theme} 0%, rgba(0, 0, 0, 0.6) 100%)`"
    />

    <div class="relative z-10 flex flex-col justify-between w-full h-full p-[60px]">
      <div>
        <h1 class="text-5xl font-bold text-white mb-4">{{ title }}</h1>
        <p class="text-2xl text-white/90 max-w-2xl line-clamp-5 text-ellipsis">{{ description }}</p>
      </div>

      <div class="flex items-center">
        <img v-if="siteLogo" :src="siteLogo" alt="Site Logo" class="w-12 h-12 object-contain mr-4 rounded" />
        <span class="text-white text-lg font-semibold">{{ siteName }}</span>
      </div>
    </div>
  </div>
</template>
