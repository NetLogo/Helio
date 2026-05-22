<template>
  <NuxtImg
    v-if="src && !error"
    :src="src"
    alt="Card image"
    class="w-full h-full object-cover rounded-t mb-4"
    defer
    :placeholder="[30, 30]"
    @error="error = true"
  />
  <div v-else class="h-full relative">
    <FallbackThumbnail />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  src?: string;
  width?: string;
}>();

const error = ref(false);
</script>
