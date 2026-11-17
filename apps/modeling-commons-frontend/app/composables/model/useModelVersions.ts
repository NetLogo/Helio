import type { MaybeRefOrGetter } from "vue";

export default function useModelVersions(
  modelId: MaybeRefOrGetter<string>,
  options: { immediate?: boolean } = {},
) {
  const id = computed(() => toValue(modelId));

  return useAsyncData<ModelVersion[]>(
    () => `model-versions-${id.value}`,
    () => (id.value ? fetchModelVersions(id.value) : Promise.resolve([])),
    { watch: [id], immediate: options.immediate ?? true, lazy: true },
  );
}
