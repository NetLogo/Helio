import type { MaybeRefOrGetter } from "vue";

export default function useForumModel(modelId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(modelId));

  return useAsyncData<Model | null>(
    () => `model-${id.value}`,
    () => (id.value ? fetchModel(id.value) : Promise.resolve(null)),
    { watch: [id] },
  );
}
