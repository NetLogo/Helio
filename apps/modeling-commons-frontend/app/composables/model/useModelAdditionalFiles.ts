import type { MaybeRefOrGetter } from "vue";

export default function useModelAdditionalFiles(
  modelId: MaybeRefOrGetter<string>,
  options: { immediate?: boolean } = {},
) {
  const id = computed(() => toValue(modelId));

  return useAsyncData<AdditionalFile[]>(
    () => `model-additional-files-${id.value}`,
    () => (id.value ? fetchModelAdditionalFiles(id.value) : Promise.resolve([])),
    { watch: [id], immediate: options.immediate ?? true, lazy: true },
  );
}
