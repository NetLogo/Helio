<template>
  <UContainer>
    <div class="py-2">
      <UButton variant="ghost" icon="i-lucide-arrow-left" to="/models" size="sm" class="mb-4 -ml-2 text-slate-500">
        Back to models
      </UButton>
      <ModelDetail @retry="fetchData" />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { useModelDetailStore } from "~/stores/modelDetail";

const route = useRoute();
const store = useModelDetailStore();
const modelId = computed(() => route.params.id as string);

useSeoMeta({
  title: () => store.currentVersion?.title ?? "Model",
  description: () => store.currentVersion?.description ?? "View model details",
});

async function fetchData() {
  await store.fetchModel(modelId.value);
}

watch(modelId, (id) => {
  if (id) fetchData();
}, { immediate: true });

onUnmounted(() => {
  store.clear();
});
</script>
