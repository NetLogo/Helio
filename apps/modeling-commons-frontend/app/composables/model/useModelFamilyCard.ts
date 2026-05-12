import type { MaybeRefOrGetter } from "vue";

type ModelFamilyCard = ResponseSuccessData<"GET", "/api/v1/models/{id}/family/card">;

export default function useModelFamilyCard(modelId: MaybeRefOrGetter<string>) {
  const { GET } = useApi();
  const id = computed(() => toValue(modelId));

  return useAsyncData<ModelFamilyCard | null>(
    () => `model-family-card-${id.value}`,
    async () => {
      if (!id.value) return null;
      const { data, error } = await GET("/api/v1/models/{id}/family/card", {
        params: { path: { id: id.value } },
      });
      if (error) throw error;
      return data ?? null;
    },
    { watch: [id], lazy: true, immediate: false },
  );
}

export type { ModelFamilyCard };
