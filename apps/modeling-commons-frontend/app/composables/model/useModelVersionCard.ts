import type { MaybeRefOrGetter } from "vue";

export default function useModelVersionCard(
  modelId: MaybeRefOrGetter<string>,
  versionNumber: MaybeRefOrGetter<number>,
) {
  const id = computed(() => toValue(modelId));
  const version = computed(() => toValue(versionNumber));

  return useAsyncData<ModelVersionCard | null>(
    () => `version-card-${id.value}-${version.value}`,
    () =>
      id.value && version.value
        ? fetchModelVersionCard(id.value, version.value)
        : Promise.resolve(null),
    { watch: [id, version] },
  );
}
