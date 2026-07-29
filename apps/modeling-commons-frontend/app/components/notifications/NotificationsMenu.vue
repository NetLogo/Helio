<script lang="ts">
import type { Notification } from "./shared";
const iconMap: Record<Notification["category"], string> = {
  "comment.on_your_model": "lucide:message-circle",
  "comment.reply_to_you": "lucide:message-circle",
  "general.daily_digest": "lucide:bell",
};
</script>

<script lang="ts" setup>
const { notifications, unreadCount, pending, error, markRead } = useNotifications();
const hasUnreadNotifications = computed(() => unreadCount.value > 0);
</script>

<template>
  <UDropdownMenu :content="{ align: 'center' }">
    <UButton
      icon="mdi:bell-outline"
      variant="outline"
      color="primary"
      size="xs"
      square
      title="Notifications"
      class="relative"
    >
      <div
        v-if="hasUnreadNotifications"
        class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"
        aria-label="Unread notifications"
      />
    </UButton>
    <template #content-top>
      <div
        class="flex flex-col justify-center gap-2 px-4 pt-6 pb-4 max-w-lg sm:min-w-sm tabular-nums"
      >
        <div class="mx-2 px-2 flex items-center gap-2">
          <h6>Notifications</h6>
          <UBadge
            v-if="hasUnreadNotifications"
            variant="solid"
            color="primary"
            size="md"
            class="aspect-square"
          >
            <span class="number-container">{{ unreadCount }}</span>
          </UBadge>
        </div>

        <AsyncBoundary
          :pending="pending"
          :error="error"
          :empty="notifications.length === 0"
          class="text-sm"
        >
          <div class="flex flex-col gap-2 w-full max-h-120 overflow-y-auto scrollbar-hidden rounded gradient-boundary-scroll">
            <NuxtLink
              v-for="notification in notifications"
              :key="notification.id"
              :to="notification.url"
              class="flex flex-col gap-2 px-4  py-3 hover:bg-royal-blue-lightest/50 rounded-lg cursor-pointer"
              :class="{
                'bg-royal-blue-lightest/90': !notification.readAt
              }"
              @click="markRead(notification.id)"
            >
              <div class="flex gap-3 items-center">
                <NuxtLink v-if="notification.actor?.thumbnailUrl" :to="notification.actor?.url">
                  <NuxtImg
                    :src="notification.actor.thumbnailUrl"
                    width="32"
                    height="32"
                    class="rounded-full"
                  />
                </NuxtLink>
                <div
                  v-else-if="notification.category in iconMap"
                  class="size-8 flex justify-center items-center bg-royal-blue-lightest rounded-full"
                >
                  <UIcon :name="iconMap[notification.category]" class="size-4 text-royal-blue" />
                </div>

                <p class="text-sm text-gray-700 w-60 line-clamp-5 text-ellipsis text-pretty">
                  {{ notification.title }}: "{{ notification.body }}"<span
                    class="text-xs text-gray-500 italic"
                    :title="formatTimestamp(notification.createdAt)"
                    ><Middot />{{ formatRelativeDate(notification.createdAt) }}</span
                  >
                </p>

                <NuxtLink v-if="notification.target?.thumbnailUrl" :to="notification.target?.url">
                  <NuxtImg
                    :src="notification.target.thumbnailUrl"
                    width="32"
                    height="32"
                    class="rounded outline-royal-blue-ligh outline-1 outline-offset-1"
                  />
                </NuxtLink>
              </div>
            </NuxtLink>
          </div>
        </AsyncBoundary>
      </div>
    </template>
  </UDropdownMenu>
</template>
