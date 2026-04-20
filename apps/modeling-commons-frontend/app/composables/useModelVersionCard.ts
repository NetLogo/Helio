import type { MaybeRefOrGetter } from "vue";

type ModelVersionCard = ResponseSuccessData<
  "GET",
  "/api/v1/models/{id}/versions/{version}/card"
>;

export default function useModelVersionCard(
  modelId: MaybeRefOrGetter<string>,
  versionNumber: MaybeRefOrGetter<number>,
) {
  const { GET } = useApi();
  const id = computed(() => toValue(modelId));
  const version = computed(() => toValue(versionNumber));

  return useAsyncData<ModelVersionCard | null>(
    () => `version-card-${id.value}-${version.value}`,
    async () => {
      if (!id.value || !version.value) return null;
      const { data, error } = await GET("/api/v1/models/{id}/versions/{version}/card", {
        params: { path: { id: id.value, version: version.value } },
      });
      if (error) throw error;
      return data ?? null;
    },
    { watch: [id, version] },
  );
}

export type { ModelVersionCard };
