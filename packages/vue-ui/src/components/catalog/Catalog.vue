<template>
  <section
    ref="rootEl"
    :class="cn($style['sidebar'], isMenuActive && $style['menu-active'])"
    role="navigation"
    aria-label="Catalog Navigation"
    v-bind="$attrs"
  >
    <slot />
  </section>
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
import { provide, ref } from 'vue'

const rootEl = ref<HTMLElement>()
const isMenuActive = ref(false)

const toggleMenu = (): void => {
  isMenuActive.value = !isMenuActive.value
}

// Provide the toggle function to child components
provide('catalogToggle', toggleMenu)
provide('catalogMenuActive', isMenuActive)

// Expose the root element for parent components
defineExpose({
  rootEl,
})
</script>

<style module src="./Catalog.module.scss"></style>
