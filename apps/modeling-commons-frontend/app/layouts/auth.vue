<template>
  <div class="h-screen flex items-center justify-center px-4">
    <UButton
      icon="i-lucide-chevron-left"
      to="/"
      size="xl"
      color="neutral"
      variant="subtle"
      class="absolute left-8 top-8 rounded-full z-10"
    />

    <UPageCard variant="subtle" class="max-w-md w-full">
      <slot />
    </UPageCard>

    <TurtlesSVG
      class="absolute bottom-0 left-0 m-10 w-12 opacity-100 pointer-events-none select-none"
    />
  </div>
</template>

<script setup lang="ts">
import TurtlesSVG from "@repo/vue-ui/assets/brands/Turtles.svg";
</script>
