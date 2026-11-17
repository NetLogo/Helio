import type { MaybeRefOrGetter } from "vue";

export default function useModelFamilyCard(modelId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(modelId));

  return useAsyncData<ModelFamilyCard | null>(
    () => `model-family-card-${id.value}`,
    () => (id.value ? fetchModelFamilyCard(id.value) : Promise.resolve(null)),
    { watch: [id], lazy: true, immediate: false },
  );
}
