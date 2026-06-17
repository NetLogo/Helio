<template>
  <UBlogPost
    :to="createModelPath(card.model.id, title)"
    :title="title"
    :badge="badges[0]"
    :authors="authors"
    :date="formatRelativeDate(card.model.createdAt)"
    :ui="{}"
    :orientation="orientation"
    class="hover:scale-102 transition-transform duration-300"
  >
    <template #header>
      <ModelCardPreviewImage :key="imageSrc" :src="imageSrc" :alt="title" />
    </template>
    <template v-if="orientation === 'horizontal'" #description>
      <div class="flex flex-col gap-5 h-full my-2">
        <TagList :tags="card.tagsOnLatestVersion" />
      </div>
    </template>
    <template v-if="orientation === 'vertical'" #footer>
      <ModelStats
        :downloads="card.stats.downloads"
        :views="card.stats.views"
        :runs="card.stats.runs"
      />
    </template>
  </UBlogPost>
</template>

<script setup lang="ts">
import type { BadgeProps, UserProps } from "#ui/types";
import type { ModelCard } from "~/composables/model/useModelCard";

const props = withDefaults(
  defineProps<{
    card: ModelCard;
    orientation?: "horizontal" | "vertical";
  }>(),
  {
    orientation: "vertical",
  },
);

const title = computed(() => props.card.latestVersion?.title || "Untitled Model");

const imageSrc = computed(() =>
  props.card.previewImageUrl ? appendWindowProtocol(props.card.previewImageUrl) : undefined,
);

const badges = computed<BadgeProps[]>(() => {
  const result: BadgeProps[] = [];
  if (props.card.model.isEndorsed) {
    result.push({ icon: "i-lucide-award", label: "Featured", variant: "outline" });
  }
  if (props.card.model.parentModelId) {
    result.push({ icon: "i-lucide-git-branch", label: "Derived", variant: "outline" });
  }
  if (props.card.model.visibility === "public") return result;
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
    avatar: { alt: a.userName ?? undefined, src: a.userImage ?? undefined },
    to: createSlugPath("users", a.userId, a.userName ?? "anonymous"),
  })),
);
</script>
