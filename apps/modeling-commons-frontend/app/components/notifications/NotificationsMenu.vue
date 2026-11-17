<script lang="ts" setup>
import type { UserNotification } from "~/features/notifications/types";

const { notifications, unreadCount, pending, error, markRead, hasMore } = useNotifications();
const hasUnreadNotifications = computed(() => unreadCount.value > 0);
const bellLabel = computed(() =>
  hasUnreadNotifications.value
    ? fillTemplate(notificationLiterals.bellUnreadLabel, { count: unreadCount.value })
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
        <div class="px-2 mx-2 mt-2 mb-2 flex items-center gap-3">
          <h6>{{ notificationLiterals.bellLabel }}</h6>
          <UBadge
            v-if="hasUnreadNotifications"
            variant="solid"
            color="primary"
            size="sm"
            class="aspect-square rounded-full"
          >
            <span class="number-container">{{ unreadCount }}</span>
          </UBadge>
        </div>

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
          <div
            class="space-y-3 w-full max-h-[min(30rem,60dvh)] overflow-y-auto overscroll-contain scrollbar-hidden rounded gradient-boundary-scroll"
          >
            <NotificationsItem
              v-for="notification in notifications"
              :key="notification.id"
              :notification="notification"
              @read="openNotification(notification.id)"
            />
          </div>
        </AsyncBoundary>

        <p v-if="hasNotifications && error" role="alert" class="text-xs text-error text-center">
          {{ notificationLiterals.loadErrorMessage }}
        </p>

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
