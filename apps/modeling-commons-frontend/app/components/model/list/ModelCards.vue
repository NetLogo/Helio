<template>
  <div
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

    <ModelsEmpty v-else-if="!loading && !cards.length" class="col-span-full" />

    <Loader v-if="loading" />
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

onMounted(() => {
  useInfiniteScroll(
    window,
    () => {
      emit("onLoadMore");
    },
    {
      distance: 25,
      interval: 250,
      canLoadMore: () => {
        return props.canLoadMore;
      },
    },
  );
});
</script>
