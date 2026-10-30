<template>
  <video
    ref="video"
    :src="src"
    :poster="poster"
    :aria-label="label"
    role="img"
    muted
    loop
    playsinline
    disablepictureinpicture
    preload="none"
    class="block bg-neutral-900 object-cover"
  />
</template>

<script setup lang="ts">
import { useElementVisibility, useMediaQuery } from "@vueuse/core";

defineProps<{ src: string; poster: string; label: string }>();

const video = useTemplateRef<HTMLVideoElement>("video");
const visible = useElementVisibility(video);
const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

watchEffect(() => {
  const element = video.value;
  if (!element) return;
  if (visible.value && !reducedMotion.value) {
    // Autoplay needs the muted property; the muted attribute does not reliably set it.
    element.muted = true;
    // play() rejects when a pause() interrupts it; the poster stays up, which is fine.
    element.play().catch(() => {});
  } else {
    element.pause();
  }
});
</script>
