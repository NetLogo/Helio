import type { MaybeRefOrGetter } from "vue";

type VersionsResponse = ResponseSuccessData<"GET", "/api/v1/models/{id}/versions">;
type ModelVersion = VersionsResponse["data"][number];

export default function useModelVersions(
  modelId: MaybeRefOrGetter<string>,
  options: { immediate?: boolean } = {},
) {
  const { GET } = useApi();
  const id = computed(() => toValue(modelId));

  return useAsyncData<ModelVersion[]>(
    () => `model-versions-${id.value}`,
    async () => {
      if (!id.value) return [];
      const { data, error } = await GET("/api/v1/models/{id}/versions", {
        params: { path: { id: id.value }, query: { limit: 100, page: 0 } },
      });
      if (error) throw error;
      return data?.data ?? [];
    },
    { watch: [id], immediate: options.immediate ?? true, lazy: true },
  );
}

export type { ModelVersion };
