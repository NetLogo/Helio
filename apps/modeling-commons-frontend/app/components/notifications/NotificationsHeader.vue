<script lang="ts" setup>
import { notificationLiterals } from "~/features/notifications/literals";
defineProps<{ unreadCount: number }>();
</script>

<template>
  <div class="px-2 mx-2 mt-2 mb-2 flex items-center gap-3">
    <h6>{{ notificationLiterals.bellLabel }}</h6>
    <UBadge
      v-if="unreadCount > 0"
      variant="solid"
      color="primary"
      size="sm"
      class="aspect-square rounded-full"
    >
      <span class="number-container">{{ unreadCount }}</span>
    </UBadge>
  </div>
</template>