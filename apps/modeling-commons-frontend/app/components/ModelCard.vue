<template>
  <UBlogPost
    :to="createModelPath(card.model.id, title)"
    :title="title"
    :description="description"
    :badge="badges[0]"
    :authors="authors"
    :date="formatRelativeDate(card.model.createdAt)"
    :ui="{
      root: 'rounded',
      header: 'h-50',
    }"
  >
    <template #header>
      <ModelCardPreviewImage :src="imageSrc" :alt="title" />
    </template>
    <template #title>
      <h4
        class="text-md font-semibold text-highlighted leading-tight max-w-full overflow-hidden text-ellipsis transition-colors group-hover:text-primary-700"
      >
        {{ title }}
      </h4>
    </template>
    <template #description>
      <p class="text-sm text-muted line-clamp-6 h-[6lh] leading-relaxed">
        {{ description }}
      </p>
    </template>
    <template #footer>
      <div class="flex items-center gap-3 text-sm text-toned">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-download" class="size-4" />
          <span class="font-medium">{{ numberFormatter.format(card.stats.downloads) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-eye" class="size-4" />
          <span class="font-medium">{{ numberFormatter.format(card.stats.views) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-play" class="size-4" />
          <span class="font-medium">{{ numberFormatter.format(card.stats.runs) }}</span>
        </div>
      </div>
    </template>
  </UBlogPost>
</template>

<script setup lang="ts">
import type { BadgeProps, UserProps } from "#ui/types";
import type { ModelCard } from "~/composables/useModelCard";

const props = defineProps<{
  card: ModelCard;
}>();

const title = computed(() => props.card.latestVersion?.title || "Untitled Model");
const description = computed(
  () => props.card.latestVersion?.description || "No description provided.",
);
const imageSrc = computed(() =>
  props.card.previewImageUrl ? appendWindowProtocol(props.card.previewImageUrl) : undefined,
);

const badges = computed<BadgeProps[]>(() => {
  const result: BadgeProps[] = [];
  if (props.card.model.isEndorsed) {
    result.push({ icon: "i-lucide-award", label: "Featured" });
  }
  if (props.card.model.parentModelId) {
    result.push({ icon: "i-lucide-git-branch", label: "Derived" });
  }
  result.push({
    icon: getVisibilityIcon(props.card.model.visibility),
    variant: "solid",
    color: "primary",
  });
  return result;
});

const authors = computed<UserProps[]>(() =>
  props.card.authors.map((a) => ({
    name: a.userName ?? undefined,
    avatar: { alt: a.userName ?? undefined },
  })),
);
</script>
