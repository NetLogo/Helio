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
  <div
    class="relative overflow-hidden mask-[linear-gradient(to_bottom,transparent_0%,white_8%,white_92%,transparent_100%)]"
    :style="{ height }"
  >
    <div class="flex h-full items-start" :style="{ gap: columnGap }">
      <slot />
    </div>
  </div>
</template>
