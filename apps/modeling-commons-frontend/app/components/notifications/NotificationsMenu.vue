<script lang="ts" setup>
import type { UserNotification } from "~/features/notifications/types";

const { notifications, unreadCount, pending, error, markRead, hasMore } = useNotifications();
const hasUnreadNotifications = computed(() => unreadCount.value > 0);
const bellLabel = computed(() =>
  hasUnreadNotifications.value
    ? notificationLiterals.bellUnreadLabel.replace("{count}", String(unreadCount.value))
    : notificationLiterals.bellLabel,
);
const showSeeAll = computed(() => notifications.value.length > 0 || hasMore.value);
const hasNotifications = computed(() => notifications.value.length > 0);
const open = ref(false);

function openNotification(id: UserNotification["id"]) {
  open.value = false;
  markRead(id);
}
</script>

<template>
  <UPopover v-model:open="open" :content="{ align: 'center', avoidCollisions: true }">
    <UButton
      icon="mdi:bell-outline"
      variant="outline"
      color="primary"
      size="xs"
      square
      :title="notificationLiterals.bellLabel"
      :aria-label="bellLabel"
      class="relative"
    >
      <span
        v-if="hasUnreadNotifications"
        class="absolute top-0 right-0 size-2 bg-red-500 rounded-full"
      />
    </UButton>

    <template #content>
      <div
        class="flex flex-col justify-center gap-2 px-4 pt-6 pb-4 max-w-[min(32rem,calc(100vw-1rem))] sm:min-w-sm tabular-nums"
      >
        <NotificationsHeader :unread-count="unreadCount" />

        <AsyncBoundary
          :pending="pending && !hasNotifications"
          :error="hasNotifications ? null : error"
          :empty="!hasNotifications"
          class="text-sm"
        >
          <template #error>
            <Error
              icon="lucide:alert-triangle"
              :title="notificationLiterals.loadErrorTitle"
              :message="notificationLiterals.loadErrorMessage"
              class="text-sm"
            />
          </template>
          <NotificationsList :notifications="notifications" @read="openNotification" />
        </AsyncBoundary>

        <UButton
          v-if="showSeeAll"
          to="/notifications"
          variant="link"
          size="xs"
          class="self-center"
          @click="open = false"
        >
          {{ notificationLiterals.menuSeeAll }}
        </UButton>
      </div>
    </template>
  </UPopover>
</template>
