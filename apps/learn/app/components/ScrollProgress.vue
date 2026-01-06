<template>
  <ClientOnly>
    <UProgress
      v-model="scrollPercentage"
      class="fixed top-(--ui-header-height) left-0 w-full h-1 z-20"
      color="primary"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const scrollPercentage = ref(0);
const updateScrollPercentage = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const newValue = docHeight ? (scrollTop / docHeight) * 100 : 0;
  if (typeof newValue === 'number' && !isNaN(newValue)) {
    scrollPercentage.value = Math.min(Math.max(newValue, 0), 100);
  }
};

onMounted(() => {
  window.addEventListener('scroll', updateScrollPercentage);
  updateScrollPercentage();
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollPercentage);
});
</script>
