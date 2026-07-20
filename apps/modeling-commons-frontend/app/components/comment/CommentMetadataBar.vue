<template>
  <div class="flex items-center gap-3">

    <NuxtLink v-if="author.url" :to="author.url" class="font-semibold">{{ author.name }}</NuxtLink>
    <span v-else class="font-semibold">{{ author.name }}</span>
    <NuxtLink
      v-if="threadLink"
      :to="threadLink"
      class="text-xs text-gray-500 hover:text-gray-700 hover:underline transition-colors"
    >
      {{ formatRelativeDate(createdAt) }}
    </NuxtLink>
    <span v-else class="text-xs text-gray-500">{{ formatRelativeDate(createdAt) }}</span>
    <span v-if="edited" class="text-xs text-gray-500">(edited)</span>
    <UButton
      v-if="collapsible"
      :icon="collapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
      variant="ghost"
      color="neutral"
      size="xs"
      class="p-1"
      :aria-expanded="!collapsed"
      :aria-label="collapsed ? 'Expand comment' : 'Collapse comment'"
      @click="emit('toggle-collapse')"
    />
    <span v-if="collapsed" class="text-xs text-gray-500">{{ collapsedSummary }}</span>

  </div>
</template>

<script lang="ts" setup>
import type { CommentMetadataBarProps } from "./types";

const props = withDefaults(defineProps<CommentMetadataBarProps>(), {
  edited: false,
  collapsible: false,
  collapsed: false,
  hiddenReplyCount: 0,
});

const emit = defineEmits<{
  "toggle-collapse": [];
}>();

const collapsedSummary = computed(() => {
  if (props.hiddenReplyCount === 0) return "· collapsed";
  return props.hiddenReplyCount === 1
    ? "· 1 reply hidden"
    : `· ${props.hiddenReplyCount} replies hidden`;
});
</script>
