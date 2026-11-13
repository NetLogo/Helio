<script lang="ts" setup>
import { notificationLiterals } from "~/features/notifications/literals";
</script>

<template>
  <UButton
    icon="mdi:bell-outline"
    variant="outline"
    color="primary"
    size="xs"
    square
    :title="notificationLiterals.bellLabel"
    :aria-label="notificationLiterals.bellLabel"
    class="relative"
  />
</template>