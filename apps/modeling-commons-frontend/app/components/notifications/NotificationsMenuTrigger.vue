<script lang="ts" setup>
withDefaults(defineProps<{ hasUnread?: boolean }>(), { hasUnread: false });
</script>

<template>
  <UButton
    icon="mdi:bell-outline"
    variant="outline"
    color="primary"
    size="xs"
    square
    title="Notifications"
    class="relative"
  >
    <span v-if="hasUnread" class="absolute top-0 right-0 size-2 bg-red-500 rounded-full">
      <span class="sr-only">Unread notifications</span>
    </span>
  </UButton>
</template>