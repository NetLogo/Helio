<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-default font-sans">
    <slot name="bar" />
    <main class="flex min-h-0 flex-1 flex-col">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
useProductHead();
</script>
