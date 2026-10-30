<template>
  <figure
    class="@container m-0 mx-auto grid w-full min-w-0 max-w-hero-model items-center gap-8 lg:mx-0 lg:max-w-none xl:grid-cols-[minmax(0,1fr)_auto] xl:gap-x-0 xl:gap-y-6"
  >
    <NtScreen>
      <NtLoopVideo
        :src="video.src"
        :poster="video.poster"
        :label="`The ${model.title} model running: ants carry food from colored piles back to the violet nest, leaving green pheromone trails`"
        class="aspect-square w-full rounded-screen ring-1 ring-black/60"
      />

      <div class="mt-4 flex justify-start">
        <UButton
          size="lg"
          icon="i-lucide-play"
          trailing-icon="i-lucide-arrow-up-right"
          label="Run it"
          :to="getModelPath(model.id)"
          target="_blank"
          :ui="{ leadingIcon: 'size-4', trailingIcon: 'size-4' }"
        />
      </div>
    </NtScreen>

    <NtBlockStack
      tilt
      :blocks="GO_PROGRAM"
      role="img"
      aria-label="The Ants Go program in blocks: Go. Each ant: if I am not carrying food, turn towards pheromone smell. Wiggle. Move forward."
      class="hero-stack relative z-10 mx-auto w-stack max-w-11/12"
    />

    <figcaption class="wall-clear text-center text-sm text-toned xl:col-span-2">
      The {{ model.title }} model, with blocks from its Go program.
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import type { GalleryModel } from "~/composables/useModels";
import { GO_PROGRAM } from "~/data/blocks/hero";

defineProps<{ model: GalleryModel; video: { src: string; poster: string } }>();
</script>

<style scoped>
/*
  Beside the player, the stack's width scales with the column so the player keeps a usable size from 1280px up.
  The blocks keep their fixed type size.
*/
@media (width >= 80rem) {
  .hero-stack.nt-stack {
    --stack-width: min(21.25rem, 46cqi);

    /* Past the frame's side padding and into the video, so the stack's edge never lines up with either. */
    margin-left: calc(-1.75rem - 2em);
    /* Wider than the type scale alone so the longest label stays on one line; the type itself does not shrink. */
    width: 27.5em;
    max-width: none;
    font-size: calc(var(--stack-width) / 26.5625);
  }
}

/* Below 1360px the type is small enough that rounding needs a little more room. */
@media (80rem <= width < 85rem) {
  .hero-stack.nt-stack {
    width: 29em;
  }
}
</style>
