<template>
  <nav
    :id="id"
    :class="cn($style['container'], !show && $style['hide'], Boolean(blurBackdrop) && $style['blurBackdrop'])"
    :style="{
      '--blur-backdrop': blurBackdrop,
    }"
    :data-show="show"
    v-bind="$attrs"
  >
    <NavbarMenuToggle :id="id" ref="menuToggleRef" />
    <NavbarRow>
      <NavbarAnchorContainer :id="id">
        <NavbarBrandContainer v-if="brand" :href="brandHref" v-bind="brandAttrs">
          <component :is="brand" v-if="typeof brand === 'object'" />
          <template v-else>
            {{ brand }}
          </template>
        </NavbarBrandContainer>
      </NavbarAnchorContainer>
      <slot />
    </NavbarRow>
    <slot />
  </nav>
</template>

<script setup lang="ts">
import { defined } from '@repo/utils/std/null'
import { cn } from '@repo/vue-ui/utils'

import type { NavbarProps } from './types'

import { useTemplateRef } from 'vue'
import type NavbarMenuToggle from './NavbarMenuToggle.vue'

type Props = NavbarProps & {
  brandAttrs?: Record<string, unknown>
}

type MenuToggleInstance = InstanceType<typeof NavbarMenuToggle>

const menuToggleRef = useTemplateRef<MenuToggleInstance>('menuToggleRef')
const blur = (): void => {
  if (defined(menuToggleRef.value)) {
    menuToggleRef.value.blur()
  }
}

withDefaults(defineProps<Props>(), {
  blurBackdrop: 0,
  show: true,
  brandAttrs: () => ({}),
})

defineExpose({
  blur,
})
</script>

<style module src="./Navbar.module.scss"></style>
