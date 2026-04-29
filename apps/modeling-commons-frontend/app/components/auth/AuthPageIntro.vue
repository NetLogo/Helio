<template>
  <div class="grid justify-items-center gap-3 text-center">
    <slot name="leading">
      <UIcon :name="icon" class="text-primary text-4xl" />
    </slot>
    <div class="grid gap-2">
      <h1 class="m-0 text-2xl font-medium text-highlighted">{{ title }}</h1>
      <p class="m-0 text-sm text-muted">
        <slot>{{ description }}</slot>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description?: string;
}>();
</script>
