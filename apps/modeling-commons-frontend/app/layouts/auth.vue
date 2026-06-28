<template>
  <div
    class="min-h-screen flex items-center justify-center px-4 py-8 bg-linear-to-b from-[#F7F9FC] to-[#F8F5FE]"
  >
    <div class="absolute inset-0">
      <ConnectionBanner />
    </div>

    <UButton
      to="/"
      size="xl"
      color="neutral"
      variant="ghost"
      class="absolute left-8 top-8 rounded-full z-10"
    >
      <TurtlesSVG
        class="w-12 pointer-events-none select-none hidden md:block"
      />
    </UButton>


    <UPageCard
      variant="subtle"
      class="max-w-2xl w-full"
      :ui="{
        root: 'ring-0 border-0',
        container: 'bg-neutral-white rounded-lg px-5 sm:px-10 py-10 md:px-30 md:py-16',
      }"
    >
      <slot />
    </UPageCard>

  </div>
</template>

<script setup lang="ts">
import TurtlesSVG from "@repo/vue-ui/assets/brands/Turtles.svg";
</script>
