<script lang="ts" setup>
import labels from "~/data/notifications.json";
import type { Notification } from "./shared";

const props = defineProps<{ notification: Notification; wide?: boolean }>();

const emit = defineEmits<{ read: [] }>();

const target = computed(() => props.notification.target);
const targetLabel = computed(() =>
  target.value?.name
    ? labels.viewNamedLabel.replace("{name}", target.value.name)
    : labels.targetFallbackLabel,
);
</script>

<template>
  <div
    class="relative flex gap-3 items-center px-4 py-4 rounded-lg hover:bg-royal-blue-lightest/50"
    :class="{ 'bg-royal-blue-lightest/90': !notification.readAt }"
  >
    <NotificationsItemAvatar :notification="notification" />

    <NuxtLink
      :to="notification.url"
      class="text-sm text-gray-700 line-clamp-5 text-ellipsis text-pretty after:absolute after:inset-0 after:content-['']"
      :class="wide ? 'flex-1 min-w-0' : 'w-60'"
      @click="emit('read')"
    >
      {{ notification.title }}: "{{ notification.body }}"<span
        class="text-xs text-gray-500 italic"
        :title="formatTimestamp(notification.createdAt)"
        ><Middot />{{ formatRelativeDate(notification.createdAt) }}</span
      >
    </NuxtLink>

    <NuxtLink
      v-if="target?.thumbnailUrl"
      :to="target.url"
      :aria-label="targetLabel"
      class="relative z-10 shrink-0"
    >
      <NuxtImg
        :src="target.thumbnailUrl"
        width="40"
        height="40"
        :alt="target.name ?? ''"
        class="rounded outline-neutral outline-2 outline-offset-1 size-10 object-cover"
      />
    </NuxtLink>
  </div>
</template>
