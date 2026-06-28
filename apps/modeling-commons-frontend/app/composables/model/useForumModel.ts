import type { MaybeRefOrGetter } from "vue";

type Model = ResponseSuccessData<"GET", "/api/v1/models/{id}">;

export default function useForumModel(modelId: MaybeRefOrGetter<string>) {
  const { GET } = useApi();
  const id = computed(() => toValue(modelId));

  return useAsyncData<Model | null>(
    () => `model-${id.value}`,
    async () => {
      if (!id.value) return null;
      const { data, error } = await GET("/api/v1/models/{id}", {
        params: { path: { id: id.value } },
      });
      if (error) throw error;
      return data ?? null;
    },
    { watch: [id] },
  );
}

export type { Model };
