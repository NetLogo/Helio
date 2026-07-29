<script lang="ts" setup>
import type { Notification } from "./shared";

const props = defineProps<{ notification: Notification }>();

const emit = defineEmits<{ read: [] }>();

const targetUrl = computed(() => props.notification.target?.url);

function openTarget() {
  if (targetUrl.value) navigateTo(targetUrl.value);
}
</script>

<template>
  <NuxtLink
    :to="notification.url"
    class="flex gap-3 items-center px-4 py-4 rounded-lg cursor-pointer hover:bg-royal-blue-lightest/50"
    :class="{ 'bg-royal-blue-lightest/90': !notification.readAt }"
    @click="emit('read')"
  >
    <NotificationsItemAvatar :notification="notification" />

    <p class="text-sm text-gray-700 w-60 line-clamp-5 text-ellipsis text-pretty">
      {{ notification.title }}: "{{ notification.body }}"<span
        class="text-xs text-gray-500 italic"
        :title="formatTimestamp(notification.createdAt)"
        ><Middot />{{ formatRelativeDate(notification.createdAt) }}</span
      >
    </p>

    <button
      v-if="notification.target?.thumbnailUrl"
      type="button"
      class="shrink-0"
      @click.stop.prevent="openTarget"
    >
      <NuxtImg
        :src="notification.target.thumbnailUrl"
        width="40"
        height="40"
        alt=""
        class="rounded outline-neutral outline-2 outline-offset-1 size-10 object-cover"
      />
    </button>
  </NuxtLink>
</template>