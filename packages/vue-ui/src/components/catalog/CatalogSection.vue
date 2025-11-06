<template>
  <div
    ref="rootEl"
    :class="cn($style['item-list'], $style['heading-section'])"
    role="listbox"
    aria-label="Catalog Items List and Search"
    v-bind="$attrs"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
import { ref } from 'vue'

const rootEl = ref<HTMLElement>()

// Expose the root element for parent components
defineExpose({
  rootEl,
})
</script>

<style module src="./Catalog.module.scss"></style>
