<script setup lang="ts">
export interface MarqueeColumnProps {
  /** Scroll direction */
  direction?: 'up' | 'down'
  /** Seconds for one full loop cycle */
  speed?: number
  /** Pause scroll on hover */
  pauseOnHover?: boolean
  /** CSS width */
  width?: string
  /** Gap between cards */
  gap?: string
}

const props = withDefaults(defineProps<MarqueeColumnProps>(), {
  direction: 'up',
  speed: 50,
  pauseOnHover: true,
  width: '300px',
  gap: '14px',
})
</script>

<template>
  <div
    :class="[
      'marquee-col',
      `marquee-col--${props.direction}`,
      { 'marquee-col--pause-hover': props.pauseOnHover },
    ]"
    :style="{ width: props.width, gap: props.gap }"
  >
    <div
      class="marquee-inner"
      :style="{ animationDuration: `${props.speed}s`, gap: props.gap }"
    >
      <!-- Duplicated twice for seamless loop -->
      <slot />
      <slot />
    </div>
  </div>
</template>

<style scoped>
.marquee-col {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.marquee-inner {
  display: flex;
  flex-direction: column;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.marquee-col--up .marquee-inner {
  animation-name: marquee-scroll-up;
}
.marquee-col--down .marquee-inner {
  animation-name: marquee-scroll-down;
}

.marquee-col--pause-hover:hover .marquee-inner {
  animation-play-state: paused;
}

@keyframes marquee-scroll-up {
  0%   { transform: translateY(0) }
  100% { transform: translateY(-50%) }
}
@keyframes marquee-scroll-down {
  0%   { transform: translateY(-50%) }
  100% { transform: translateY(0) }
}
</style>
