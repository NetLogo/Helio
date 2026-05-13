<template>
  <div class="loader mx-auto py-2">
    <div v-for="i in 6" :key="i" class="arrow" :style="{ animationDelay: `${(i - 1) * (1 / 6)}s` }">
      <TurtleSvg />
    </div>
  </div>
</template>

<script setup lang="ts">
import TurtleSvg from "@repo/vue-ui/assets/turtle.svg";
</script>
<style scoped>
.loader {
  display: flex;
  align-items: center;
  gap: 4px;
}

.arrow {
  width: 20px;
  height: 18px;
  opacity: 0;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes dash {
  0% {
    opacity: 0;
    transform: translateX(-6px);
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(6px);
  }
}
</style>
