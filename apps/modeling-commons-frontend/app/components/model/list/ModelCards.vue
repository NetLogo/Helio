<template>
  <div ref="container">
    <ModelCard
      v-for="card in cards"
      v-if="cards.length"
      :key="card.model.id"
      :card="card"
      :orientation="orientation"
    />
    <ModelCardSkeleton v-for="i in 8" v-else-if="loading" :key="i" :orientation="orientation" />
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
  }>(),
  {
    orientation: "vertical",
    loading: false,
    canLoadMore: false,
  },
);

const emit = defineEmits<{
  resetFilters: [];
  onLoadMore: [];
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
