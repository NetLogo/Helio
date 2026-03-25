<template>
  <BaseCard
    :to="`/models/${model.id}`"
    :title="model.title || 'Untitled Model'"
    :description="model.description"
  >
    <template #badges>
      <span
        v-if="model.isEndorsed"
        class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
      >
        <UIcon name="i-lucide-award" class="size-3" />
        Featured
      </span>
      <span
        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        :class="getVisibilityClass(model.visibility)"
      >
        {{ model.visibility }}
      </span>
    </template>

    <template #footer>
      <time class="text-xs text-dimmed">
        {{ formatRelativeDate(model.createdAt) }}
      </time>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import type { ModelListItem } from "~/stores/models";
import { getVisibilityClass, formatRelativeDate } from "~/utils/formatters";

defineProps<{
  model: ModelListItem;
}>();
</script>
