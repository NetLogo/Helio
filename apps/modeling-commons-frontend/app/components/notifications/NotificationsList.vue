<script lang="ts" setup>
import type { UserNotification } from "~/features/notifications/types";

defineProps<{ notifications: UserNotification[] }>();

const emit = defineEmits<{ read: [id: UserNotification["id"]] }>();
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
