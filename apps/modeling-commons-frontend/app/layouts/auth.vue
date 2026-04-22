<template>
  <div
    class="min-h-screen flex items-center justify-center px-4 py-8 bg-linear-to-b from-[#F7F9FC] to-[#F8F5FE]"
  >
    <UButton
      icon="i-lucide-chevron-left"
      to="/"
      size="xl"
      color="neutral"
      variant="subtle"
      class="absolute left-8 top-8 rounded-full z-10 group/back max-w-12 hover:max-w-lg transition-all duration-300 ease-in-out"
      title="Back to Modeling Commons"
    >
      <span
        class="max-w-0 line-clamp-1 overflow-hidden group-hover/back:max-w-lg transition-all duration-300 ease-in-out"
        >Back to Modeling Commons</span
      >
    </UButton>

    <UPageCard
      variant="subtle"
      class="max-w-2xl w-full"
      :ui="{
        root: 'ring-0 border-0',
        container: 'bg-neutral-white rounded-lg md:px-30 md:py-16',
      }"
    >
      <slot />
    </UPageCard>

    <TurtlesSVG
      class="fixed bottom-0 left-0 m-10 w-12 pointer-events-none select-none hidden md:block"
    />
  </div>
</template>

<script setup lang="ts">
import TurtlesSVG from "@repo/vue-ui/assets/brands/Turtles.svg";
</script>
