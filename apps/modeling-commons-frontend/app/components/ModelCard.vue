<template>
  <BaseCard
    :to="`/models/${model.id}`"
    :title="model.title || 'Untitled Model'"
    :description="model.description"
    :image-url="model.previewImageUri ? withApiBase(model.previewImageUri) : undefined"
  >
    <template #badges>
      <UBadge v-if="model.isEndorsed" :icon="'i-lucide-award'" size="md"> Featured </UBadge>
      <UBadge v-if="model.parentModelId" :icon="'i-lucide-git-branch'" size="md" />

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
