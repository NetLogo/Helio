<template>
  <div class="text-start pt-4 px-5 pb-8 mx-auto w-3/4">
    <MDC :value="aboutData.body" class="typography about-content" />
  </div>
</template>

<script setup lang="ts">
import type { AboutEntry } from "~/utils/api";

defineProps<{
  aboutData: AboutEntry;
}>();
</script>

<!-- <style scoped>
:deep(img) {
  display: block;
  margin: 1rem auto;
  border-radius: 0.375rem;
}

:deep(h1) {
  font-size: 2.5rem;
  line-height: 3rem;
  font-weight: 500;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  /* text-align: center; */
}

:deep(h2) {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

:deep(h3) {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

:deep(iframe) {
  margin-top: 1rem;
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
}
</style> -->
