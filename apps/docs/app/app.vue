<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtErrorBoundary>
      <NuxtPage />
    </NuxtErrorBoundary>
  </NuxtLayout>
</template>

<script setup lang="ts">
const { public: { isOffline } } = useRuntimeConfig();

useHead({
  htmlAttrs: {
    'data-mode': isOffline ? 'offline' : 'online',
  },
});
</script>