<template>
  <Error :message="message" :title="title">
    <UButton variant="outline" @click="$emit('retry')"> Try again </UButton>
  </Error>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    message?: string;
  }>(),
  {
    title: "Something went wrong",
    message: "We are having trouble loading the model. Please check your connection and try again.",
  },
);

defineEmits<{ retry: [] }>();
</script>
