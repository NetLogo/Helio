<template>
  <UCard
    as="article"
    class="flex h-full flex-col"
    :ui="{ header: 'p-0 sm:px-0', body: 'flex flex-1 flex-col gap-3' }"
  >
    <template #header>
      <ModelThumbnail :model="lead" class="aspect-4/3" />
    </template>
    <NtBlock as="h3" :color="TOPIC_COLORS[group.id] ?? 'blue'" :label="group.title" class="mb-1 self-start" />
    <p class="text-sm text-muted">{{ group.description }}</p>
    <div class="flex flex-wrap gap-1">
      <a
        v-if="lesson"
        :href="lesson.url"
        target="_blank"
        rel="noopener"
        :aria-label="`Lesson: ${lesson.title}`"
      >
        <UBadge label="Lesson" icon="i-lucide-book-open" size="sm" />
      </a>
    </div>
    <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
      <UButton :to="`/models/${lead.id}`" size="sm" icon="i-lucide-play" :label="lead.title" block/>
      <UButton variant="link" color="neutral" :to="`/models-gallery#group-${group.id}`"  block size="xs" class="text-xs">
        More in this topic?
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { GalleryModel } from "~/composables/useModels";
import type { ResolvedGroup } from "~/utils/modelCuration";
import type { NtBlockColor } from "~/components/Nt/NtBlock.vue";

const TOPIC_COLORS: Record<string, NtBlockColor> = {
  "ant-colonies": "red",
  "predator-prey": "orange",
  "animal-behavior": "green",
  "gases-particles": "blue",
  "force-motion": "purple",
  "disease-fire-spread": "yellow",
  "waves-diffusion": "blue",
  "growth-networks": "green",
};

const props = defineProps<{
  group: Pick<ResolvedGroup, "id" | "title" | "description">;
  lead: GalleryModel;
}>();

const lesson = modelMetadata(useModelCuration(), props.lead.id)?.lesson ?? null;
</script>
