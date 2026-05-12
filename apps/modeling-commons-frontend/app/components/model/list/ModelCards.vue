<template>
  <div
    ref="container"
    class="gap-6"
    :class="{
      'flex flex-col ': orientation === 'horizontal',
      'grid grid-cols-1 lg:grid-cols-4': orientation === 'vertical',
    }"
  >
    <ModelError v-if="error" :error="error" @retry="emit('retry')" />

    <ModelCard
      v-for="card in cards"
      v-else-if="cards.length"
      :key="card.model.id"
      :card="card"
      :orientation="orientation"
    />

    <ModelCardSkeleton v-for="i in 8" v-else-if="loading" :key="i" :orientation="orientation" />
    <ModelsEmpty v-else-if="!loading && !cards.length" class="col-span-full" />

    <Loader v-if="loading && cards.length" />
  </div>
</template>
<script setup lang="ts">
import { useInfiniteScroll } from "@vueuse/core";
import type { ModelCard } from "~/composables/model/useModelCard";

const props = withDefaults(
  defineProps<{
    cards: Array<ModelCard>;
    orientation?: "horizontal" | "vertical";
    loading?: boolean;
    canLoadMore?: boolean;
    error?: Error;
  }>(),
  {
    orientation: "vertical",
    loading: true,
    canLoadMore: false,
    error: undefined,
  },
);

const emit = defineEmits<{
  resetFilters: [];
  onLoadMore: [];
  retry: [];
}>();

const ref = useTemplateRef("container");

onMounted(() => {
  useInfiniteScroll(
    ref.value,
    () => {
      emit("onLoadMore");
    },
    {
      distance: 20,
      canLoadMore: () => {
        return props.canLoadMore;
      },
    },
  );
});
</script>
