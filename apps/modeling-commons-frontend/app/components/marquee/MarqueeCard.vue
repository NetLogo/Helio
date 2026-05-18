<template>
  <div
    class="relative isolate shrink-0 cursor-default overflow-hidden rounded-[14px] border border-black/15 bg-white transition-[transform,border-color,box-shadow] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-(--hover-scale,1.02) hover:border-royal-blue-dark"
    :class="
      !props.noShimmer &&
      `before:pointer-events-none before:absolute before:-top-[80%] before:-left-[60%] before:-z-10 before:h-[200%] before:w-[40%] before:rotate-25 before:bg-[linear-gradient(105deg,transparent_40%,rgba(100,100,100,0.02)_45%,rgba(100,100,100,0.04)_50%,rgba(100,100,100,0.02)_55%,transparent_60%)] before:animate-[mcard-shimmer_6s_ease-in-out_infinite] before:content-['']`
    "
    :style="{ width: props.width, '--hover-scale': props.hoverScale }"
  >
    <slot />
  </div>
</template>

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

<style>
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
