<template>
  <a v-if="external" target="_blank" rel="noopener noreferrer" v-bind="$attrs">
    <Icon name="fa6-solid:link" class="mr-1 inline-block align-middle" />
    <slot />
  </a>
  <NuxtLink v-else v-bind="$attrs">
    <slot />
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  external?: boolean
}>()
</script>

<style>
a:has(> .iconify):has(> img) .iconify {
  display: none;
}
</style>
