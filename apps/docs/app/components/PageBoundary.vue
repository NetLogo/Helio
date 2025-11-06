<template>
  <NuxtErrorBoundary @error="logError">
    <slot />
    <template #error="{ error }">
      <ErrorDisplay :error-code="500" error-message="An unexpected error occurred." :error-details="error.message" />
    </template>
  </NuxtErrorBoundary>
</template>

<script setup lang="ts">
const logError = (error: Error): void => {
  console.error('An error occurred:', error);
};
</script>
