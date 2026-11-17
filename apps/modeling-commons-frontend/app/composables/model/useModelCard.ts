import type { MaybeRefOrGetter } from "vue";

export default function useModelCard(modelId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(modelId));

  return useAsyncData<ModelCard | null>(
    () => `model-card-${id.value}`,
    () => (id.value ? fetchModelCard(id.value) : Promise.resolve(null)),
    { watch: [id] },
  );
}
