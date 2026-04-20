import type { MaybeRefOrGetter } from "vue";

type ModelCard = ResponseSuccessData<"GET", "/api/v1/models/{id}/card">;

export default function useModelCard(modelId: MaybeRefOrGetter<string>) {
  const { GET } = useApi();
  const id = computed(() => toValue(modelId));

  return useAsyncData<ModelCard | null>(
    () => `model-card-${id.value}`,
    async () => {
      if (!id.value) return null;
      const { data, error } = await GET("/api/v1/models/{id}/card", {
        params: { path: { id: id.value } },
      });
      if (error) throw error;
      return data ?? null;
    },
    { watch: [id] },
  );
}

export type { ModelCard };
