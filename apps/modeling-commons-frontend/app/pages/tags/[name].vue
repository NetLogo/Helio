<template>
  <UContainer>
    <div class="space-y-8">
      <div v-if="tagStatus === 'pending'" class="space-y-2">
        <div class="h-8 w-48 bg-accented rounded animate-pulse" />
        <div class="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>

      <UError v-else-if="tagError" :error="tagError" />

      <div v-else-if="tag" class="space-y-2">
        <div class="flex items-center gap-3 flex-wrap">
          <TagChip :name="tag.name" :display-name="tag.displayName" :linkable="false" />
          <h4 class="tracking-tight">{{ tag.displayName }}</h4>
        </div>
        <p class="text-sm text-muted">
          {{ pluralize(count ?? 0, "model", "models") }} tagged with
          <span class="font-medium">{{ tag.displayName }}</span>
        </p>
      </div>

      <ModelCardsOrientationSelect v-model="orientation" class="justify-end" />
      <ModelCards
        :cards="data"
        :loading="pending"
        :can-load-more="canLoadMore"
        :orientation="orientation"
        :class="{ 'pointer-events-none opacity-50': pending }"
        :error="modelsError ?? undefined"
        @on-load-more="loadNextPage()"
        @retry="refresh"
      />

      <p v-if="(count ?? 0) > 0" class="mx-auto text-center text-xs text-dimmed">
        Showing {{ data?.length ?? 0 }} of {{ count }} models
      </p>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { pluralize } from "~/utils/formatters";

const route = useRoute();
const api = useApi();

const name = computed(() => decodeURIComponent(route.params.name as string));

const {
  data: tag,
  error: tagError,
  status: tagStatus,
} = await useAsyncData(
  () => `tag-${name.value}`,
  () => fetchTagByIdOrName(api, name.value),
  { watch: [name] },
);

if (tagError.value) {
  showError(tagError.value);
}

useSeoMeta({
  title: computed(() => (tag.value ? `Models tagged "${tag.value.displayName}"` : "Tag")),
  description: computed(() =>
    tag.value
      ? `Browse NetLogo models tagged with ${tag.value.displayName}.`
      : "Browse models by tag.",
  ),
});

const orientation = ref<"horizontal" | "vertical">("horizontal");

const {
  data,
  error: modelsError,
  pending,
  loadNextPage,
  canLoadMore,
  count,
  refresh,
} = useApiPagination<ModelCard>(
  () => `tag-models-${name.value}`,
  (page) => fetchModelsByTag(api, name.value, page),
);

const indicator = useLoadingIndicator();
watch(pending, (isLoading) => {
  if (isLoading) indicator.start();
  else indicator.finish();
});
</script>
