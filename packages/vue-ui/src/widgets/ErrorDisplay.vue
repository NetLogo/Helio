<script setup lang="ts">
type Props = {
  errorCode: number
  errorDetails?: string
}
const props = defineProps<Props>()
const handleError = (): Promise<void> => clearError({ redirect: '/' })
const pageRestOptions = {
  setMinHeight: true,
  setHeight: false,
  offsetTop: true,
}
</script>

<template>
  <PageRest :v-bind="pageRestOptions" class="docs">
    <ErrorScreen v-bind="props" @handle="handleError" />
  </PageRest>
</template>
