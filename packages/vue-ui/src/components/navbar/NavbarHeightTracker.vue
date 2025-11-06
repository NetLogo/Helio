<template>
  <div ref="trackerRef" class="navbar-height-tracker" />
</template>

<script setup lang="ts">
import { wrapInArray } from '@repo/utils/std/array'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

type NavbarHeightTrackerProps = {
  /** The CSS custom property name to set on the HTML element */
  cssPropertyName?: Array<string> | string
  /** The selector for the navbar element to track */
  navbarSelector?: string
  /** Whether to track height changes with ResizeObserver */
  trackResize?: boolean
}

const props = withDefaults(defineProps<NavbarHeightTrackerProps>(), {
  cssPropertyName: () => ['--ui-header-height', '--ui-nav-height'],
  navbarSelector: 'nav',
  trackResize: true,
})

const trackerRef = ref<HTMLElement>()
let resizeObserver: null | ResizeObserver = null
let mutationObserver: MutationObserver | null = null

const updateNavbarHeight = (): void => {
  const navbar: HTMLElement | null = document.querySelector(props.navbarSelector)

  if (!navbar) {
    console.warn(`NavbarHeightTracker: Could not find navbar element with selector "${props.navbarSelector}"`)
    return
  }

  const height = navbar.offsetHeight || navbar.clientHeight
  const heightValue = `${height}px`

  wrapInArray(props.cssPropertyName).forEach((propName) => {
    document.documentElement.style.setProperty(propName, heightValue)
  })
  document.documentElement.setAttribute('data-nav-height', heightValue)
}

const setupObservers = (): void => {
  const navbar: HTMLElement | null = document.querySelector(props.navbarSelector)

  if (!navbar) {
    console.warn(`NavbarHeightTracker: Could not find navbar element with selector "${props.navbarSelector}"`)
    return
  }

  // Set up ResizeObserver to track height changes
  if (props.trackResize && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        updateNavbarHeight()
      })
    })

    resizeObserver.observe(navbar)
  }

  mutationObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false

    mutations.forEach(() => {
      shouldUpdate = true
    })

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- false positive
    if (shouldUpdate) {
      requestAnimationFrame(() => {
        updateNavbarHeight()
      })
    }
  })

  mutationObserver.observe(navbar, {
    attributeFilter: ['class', 'style', 'data-show', 'hidden'],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  })
}

const cleanup = (): void => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (mutationObserver) {
    mutationObserver.disconnect()
    mutationObserver = null
  }
}

onMounted(async () => {
  await nextTick()
  updateNavbarHeight()
  setupObservers()
  window.addEventListener('resize', updateNavbarHeight, { passive: true })
  window.addEventListener(
    'orientationchange',
    () => {
      setTimeout(updateNavbarHeight, 100)
    },
    { passive: true }
  )
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('resize', updateNavbarHeight)
  window.removeEventListener('orientationchange', updateNavbarHeight)
  wrapInArray(props.cssPropertyName).forEach((propName) => {
    document.documentElement.style.removeProperty(propName)
  })
  document.documentElement.removeAttribute('data-nav-height')
})

defineExpose({
  cleanup,
  updateHeight: updateNavbarHeight,
})
</script>

<style scoped>
.navbar-height-tracker {
  display: none;
  pointer-events: none;
}
</style>
