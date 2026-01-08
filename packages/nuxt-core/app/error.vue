<script setup lang="ts">
import type { NuxtError } from '#app';

defineProps({
  error: {
    type: Object as () => NuxtError,
    required: true,
  },
});
</script>

<template>
  <ClientNavbar />
  <ErrorDisplay :error-code="error.statusCode" :error-details="error.message" />
  <ClientFooter />
</template>
