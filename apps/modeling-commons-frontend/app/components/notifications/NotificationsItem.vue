<script lang="ts" setup>
import { useNotificationLink } from "./shared";
import type { UserNotification } from "~/features/notifications/types";

const props = defineProps<{ notification: UserNotification; wide?: boolean }>();

const emit = defineEmits<{ read: [] }>();

const inAppLink = useNotificationLink();
const target = computed(() => props.notification.target);
const thumbnailFailed = ref(false);
const showThumbnail = computed(() => Boolean(target.value?.thumbnailUrl) && !thumbnailFailed.value);
watch(
  () => target.value?.thumbnailUrl,
  () => (thumbnailFailed.value = false),
);
const targetLabel = computed(() =>
  target.value?.name
    ? fillTemplate(notificationLiterals.viewNamedLabel, { name: target.value.name })
    : notificationLiterals.targetFallbackLabel,
);
</script>

<template>
  <div
    class="relative flex gap-3 items-center px-4 py-4 rounded-lg hover:bg-royal-blue-lightest/50"
    :class="{ 'bg-royal-blue-lightest/90': !notification.readAt }"
  >
    <NotificationsItemAvatar :notification="notification" @read="emit('read')" />

    <NuxtLink
      :to="inAppLink(notification.url)"
      class="flex-1 min-w-0 text-sm text-gray-700 text-pretty after:absolute after:inset-0 after:content-['']"
      :class="wide ? 'line-clamp-5' : 'max-w-60 line-clamp-3'"
      @click="emit('read')"
    >
      <span v-if="!notification.readAt" class="sr-only">{{
        notificationLiterals.unreadRowLabel
      }}</span>
      {{ notification.title }}: "{{ notification.body }}"<span
        class="text-xs text-gray-500 italic"
        :title="formatTimestamp(notification.createdAt)"
        ><Middot />{{ formatRelativeDate(notification.createdAt) }}</span
      >
    </NuxtLink>

    <NuxtLink
      v-if="target"
      :to="inAppLink(target.url)"
      :aria-label="targetLabel"
      data-testid="notification-target"
      class="relative z-10 shrink-0 size-10 flex justify-center items-center rounded bg-royal-blue-lightest outline-neutral outline-2 outline-offset-1 overflow-hidden"
      @click="emit('read')"
    >
      <NuxtImg
        v-if="showThumbnail"
        :src="target.thumbnailUrl ?? undefined"
        width="40"
        height="40"
        :alt="target.name ?? ''"
        class="size-full object-cover"
        @error="thumbnailFailed = true"
      />
      <UIcon v-else name="i-lucide-box" class="size-4 text-royal-blue" />
    </NuxtLink>
  </div>
</template>
