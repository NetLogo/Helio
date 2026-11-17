<template>
  <UContainer class="max-w-3xl py-8">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-semibold m-0">{{ notificationLiterals.pageTitle }}</h1>
        <UBadge
          v-if="unreadCount > 0"
          variant="solid"
          color="primary"
          size="sm"
          class="tabular-nums rounded-full"
        >
          {{ unreadCount }}
        </UBadge>
      </div>
      <USwitch
        :model-value="unreadOnly"
        :label="notificationLiterals.unreadOnlyLabel"
        @update:model-value="setUnreadOnly"
      />
    </div>

    <AsyncBoundary
      :pending="pending && visibleNotifications.length === 0"
      :error="error"
      :empty="visibleNotifications.length === 0"
    >
      <template #empty>
        <Empty
          icon="i-lucide-bell-off"
          :title="unreadOnly ? notificationLiterals.emptyUnread : notificationLiterals.emptyAll"
        />
      </template>

      <div class="flex flex-col gap-3">
        <NotificationsItem
          v-for="notification in visibleNotifications"
          :key="notification.id"
          :notification="notification"
          wide
          @read="markRead(notification.id)"
        />
      </div>
    </AsyncBoundary>

    <div
      v-if="hasMore || (pending && visibleNotifications.length > 0)"
      class="flex justify-center mt-6"
    >
      <UButton variant="outline" :loading="pending" :disabled="pending" @click="nextPage()">
        {{ notificationLiterals.loadMore }}
      </UButton>
    </div>
  </UContainer>
</template>

<script setup lang="ts">

definePageMeta({
  middleware: "auth",
});

useSeoMeta({
  title: notificationLiterals.pageTitle,
  description: notificationLiterals.seoDescription,
  robots: "noindex, nofollow",
});

const {
  notifications,
  unreadCount,
  unreadOnly,
  setUnreadOnly,
  pending,
  error,
  markRead,
  nextPage,
  hasMore,
} = useNotifications();

const visibleNotifications = computed(() =>
  unreadOnly.value ? notifications.value.filter((n) => n.readAt === null) : notifications.value,
);
</script>
