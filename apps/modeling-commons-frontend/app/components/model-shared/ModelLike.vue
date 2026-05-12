<template>
  <UButton
    :variant="active ? 'solid' : 'outline'"
    :color="active ? 'primary' : 'neutral'"
    size="sm"
    icon="i-lucide-thumbs-up"
    :disabled="busy"
    @click="$emit('toggle')"
  >
    {{ active ? "Liked" : "Like" }}
  </UButton>
</template>

<script setup lang="ts">
defineProps<{
  active: boolean;
  busy?: boolean;
}>();

defineEmits<{
  toggle: [];
}>();
</script>
