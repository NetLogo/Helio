<template>
  <UBlogPost
    :to="createModelPath(card.model.id, title)"
    :title="title"
    :badge="badges[0]"
    :authors="authors"
    :date="formatRelativeDate(card.model.createdAt)"
    :ui="{
      root: 'rounded group/card',
      header: 'h-50',
      title:
        'text-md font-semibold text-highlighted line-clamp-2 leading-tight max-w-full overflow-hidden text-ellipsis transition-colors group-hover/card:text-royal-blue',
    }"
    :orientation="orientation"
  >
    <template #header>
      <ModelCardPreviewImage
        :src="imageSrc"
        :alt="title"
        class="group-hover/card:scale-110 transition-transform"
      />
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
import type { ModelCard } from "~/composables/model/useModelCard";

const props = defineProps<{
  card: ModelCard;
  orientation?: "horizontal" | "vertical";
}>();

const title = computed(() => props.card.latestVersion?.title || "Untitled Model");
// const description = computed(
//   () => props.card.latestVersion?.description || "No description provided.",
// );
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
    color: "secondary",
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
