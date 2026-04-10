<template>
  <BaseCard
    :to="`/models/${model.id}`"
    :title="model.title || 'Untitled Model'"
    :description="model.description"
  >
    <template #badges>
      <UBadge v-if="model.isEndorsed" :icon="'i-lucide-award'" size="md"> Featured </UBadge>
      <UBadge
        :icon="getVisibilityIcon(model.visibility)"
        size="md"
        :title="model.visibility"
        variant="outline"
      />
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
import { formatRelativeDate } from "~/utils/formatters";

defineProps<{
  model: ModelListItem;
}>();
</script>
