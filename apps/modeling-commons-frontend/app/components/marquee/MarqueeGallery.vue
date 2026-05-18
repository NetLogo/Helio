<script setup lang="ts">
export interface MarqueeGalleryProps {
  /** CSS height of the gallery viewport */
  height?: string;
  /** Gap between columns */
  columnGap?: string;
}

withDefaults(defineProps<MarqueeGalleryProps>(), {
  height: "520px",
  columnGap: "14px",
});
</script>

<template>
  <div class="marquee-gallery" :style="{ height }">
    <div class="marquee-gallery__inner" :style="{ gap: columnGap }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.marquee-gallery {
  position: relative;
  overflow: hidden;
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgb(255, 255, 255) 8%,
    rgb(255, 255, 255) 92%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgb(255, 255, 255) 8%,
    rgb(255, 255, 255) 92%,
    transparent 100%
  );
}

.marquee-gallery__inner {
  display: flex;
  height: 100%;
  align-items: flex-start;
}
</style>
