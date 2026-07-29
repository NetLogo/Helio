<script lang="ts" setup>
import type { Notification } from "./shared";

defineProps<{ notifications: Notification[] }>();

const emit = defineEmits<{ read: [id: Notification["id"]] }>();
</script>

<template>
  <div
    class="flex flex-col gap-3 w-full max-h-120 overflow-y-auto scrollbar-hidden rounded gradient-boundary-scroll"
  >
    <NotificationsItem
      v-for="notification in notifications"
      :key="notification.id"
      :notification="notification"
      @read="emit('read', notification.id)"
    />
  </div>
</template>