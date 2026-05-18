<script setup lang="ts">
export interface MarqueeCardProps {
  /** CSS width */
  width?: string;
  /** Disable the idle shimmer */
  noShimmer?: boolean;
  /** Hover scale factor (1 = no scale) */
  hoverScale?: number;
}

const props = withDefaults(defineProps<MarqueeCardProps>(), {
  width: "300px",
  noShimmer: false,
  hoverScale: 1.0,
});
</script>

<template>
  <div
    :class="['mcard', { 'mcard--no-shimmer': props.noShimmer }]"
    :style="{ width: props.width, '--hover-scale': props.hoverScale }"
  >
    <slot />
  </div>
</template>

<style scoped>
.mcard {
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.14);

  background: white;
  position: relative;
  overflow: hidden;
  transition:
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.35s,
    box-shadow 0.4s;
  cursor: default;
  flex-shrink: 0;
}

/* Idle shimmer */
.mcard::before {
  content: "";
  position: absolute;
  top: -80%;
  left: -60%;
  width: 40%;
  height: 200%;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(100, 100, 100, 0.02) 45%,
    rgba(100, 100, 100, 0.04) 50%,
    rgba(100, 100, 100, 0.02) 55%,
    transparent 60%
  );
  transform: rotate(25deg);
  animation: mcard-shimmer 6s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}
.mcard--no-shimmer::before {
  display: none;
}

.mcard:hover {
  transform: scale(var(--hover-scale, 1.02));
  border-color: var(--color-royal-blue-dark);
}

/* Keep slot content above shimmer */
.mcard > :deep(*) {
  position: relative;
  z-index: 2;
}

@keyframes mcard-shimmer {
  0%,
  100% {
    left: -60%;
  }
  50% {
    left: 130%;
  }
}
</style>
