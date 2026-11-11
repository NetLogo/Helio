<script lang="ts" setup>
import { iconFor } from "./shared";
import type { UserNotification } from "~/features/notifications/types";

const props = defineProps<{ notification: UserNotification }>();

const actor = computed(() => props.notification.actor);
const actorLabel = computed(() =>
  actor.value?.name
    ? notificationLiterals.viewNamedLabel.replace("{name}", actor.value.name)
    : notificationLiterals.actorFallbackLabel,
);
const icon = computed(() => iconFor(props.notification.category));
</script>

<template>
  <NuxtLink
    v-if="actor?.thumbnailUrl"
    :to="actor.url"
    :aria-label="actorLabel"
    class="relative z-10 shrink-0"
  >
    <NuxtImg
      :src="actor.thumbnailUrl"
      width="40"
      height="40"
      :alt="actor.name ?? ''"
      class="rounded-full size-10 object-cover"
    />
  </NuxtLink>

  <div
    v-else
    class="shrink-0 size-10 flex justify-center items-center bg-royal-blue-lightest rounded-full"
  >
    <UIcon :name="icon" class="size-4 text-royal-blue" />
  </div>
</template>
