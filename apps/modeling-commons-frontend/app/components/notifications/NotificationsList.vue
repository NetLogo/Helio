<script lang="ts" setup>
import type { Notification } from "./shared";

defineProps<{ notifications: Notification[] }>();

const emit = defineEmits<{ read: [id: Notification["id"]] }>();
</script>

<template>
  <div
    class="space-y-3 w-full max-h-[min(30rem,60dvh)] overflow-y-auto overscroll-contain scrollbar-hidden rounded gradient-boundary-scroll"
  >
    <NotificationsItem
      v-for="notification in notifications"
      :key="notification.id"
      :notification="notification"
      @read="emit('read', notification.id)"
    />
  </div>
</template>
