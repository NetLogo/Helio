import type { MaybeRefOrGetter } from "vue";

type AdditionalFilesResponse = ResponseSuccessData<"GET", "/api/v1/models/{id}/additional-files">;
type AdditionalFile = AdditionalFilesResponse[number];

export default function useModelAdditionalFiles(
  modelId: MaybeRefOrGetter<string>,
  options: { immediate?: boolean } = {},
) {
  const { GET } = useApi();
  const id = computed(() => toValue(modelId));

  return useAsyncData<AdditionalFile[]>(
    () => `model-additional-files-${id.value}`,
    async () => {
      if (!id.value) return [];
      const { data, error } = await GET("/api/v1/models/{id}/additional-files", {
        params: { path: { id: id.value } },
      });
      if (error) throw error;
      return data ?? [];
    },
    { watch: [id], immediate: options.immediate ?? true, lazy: true },
  );
}

export type { AdditionalFile };
