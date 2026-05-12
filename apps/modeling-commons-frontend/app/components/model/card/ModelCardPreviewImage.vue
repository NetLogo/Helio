<template>
  <NuxtImg
    v-if="src && !error"
    :src="src"
    alt="Card image"
    class="w-full h-full object-cover rounded-t mb-4"
    crossorigin="use-credentials"
    defer
    :placeholder="[30, 30]"
    @error="error = true"
  />
  <div v-else class="opacity-10 h-full relative">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="card-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="currentColor"
            stroke-width="0.5"
            class="text-primary-400"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#card-grid)" />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <slot name="icon">
        <UIcon name="i-lucide-box" class="size-12 text-primary-300 transition-colors" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  src?: string;
  width?: string;
}>();

const error = ref(false);
</script>
