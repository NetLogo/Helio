<script lang="ts" setup>
const { notifications, unreadCount, pending, error, markRead } = useNotifications();
const hasUnreadNotifications = computed(() => unreadCount.value > 0);
</script>

<template>
  <UDropdownMenu :content="{ align: 'center', avoidCollisions: true }" :modal="false">
    <UButton
      icon="mdi:bell-outline"
      variant="outline"
      color="primary"
      size="xs"
      square
      title="Notifications"
      class="relative"
    >
      <span
        v-if="hasUnreadNotifications"
        class="absolute top-0 right-0 size-2 bg-red-500 rounded-full"
      >
        <span class="sr-only">Unread notifications</span>
      </span>
    </UButton>

    <template #content-top>
      <div
        class="flex flex-col justify-center gap-2 px-4 pt-6 pb-4 max-w-lg sm:min-w-sm tabular-nums"
      >
        <NotificationsHeader :unread-count="unreadCount" />

        <AsyncBoundary
          :pending="pending"
          :error="error"
          :empty="notifications.length === 0"
          class="text-sm"
        >
          <NotificationsList :notifications="notifications" @read="markRead" />
        </AsyncBoundary>
      </div>
    </template>
  </UDropdownMenu>
</template>