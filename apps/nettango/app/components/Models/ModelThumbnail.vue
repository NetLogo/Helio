<template>
  <div class="relative aspect-square w-full overflow-hidden bg-neutral-900">
    <div
      v-if="!model.thumbnail"
      class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30"
    >
      <UIcon name="i-lucide-shapes" class="size-16 text-primary/60" />
    </div>
    <img
      v-else
      :src="model.thumbnail"
      :alt="`${model.title} model view`"
      class="absolute inset-0 size-full object-cover"
      loading="lazy"
    />
    <img
      v-if="animatedSrc"
      :src="animatedSrc"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 size-full object-cover transition-opacity duration-500"
      :class="loaded ? 'opacity-100' : 'opacity-0'"
      loading="lazy"
      @load="loaded = true"
      @error="failed = true"
    />
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import type { GalleryModel } from "~/composables/useModels";

const props = defineProps<{ model: GalleryModel }>();

const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
const loaded = ref(false);
const failed = ref(false);

const animatedSrc = computed(() =>
  failed.value || reducedMotion.value ? undefined : props.model.animatedThumbnail,
);
</script>
