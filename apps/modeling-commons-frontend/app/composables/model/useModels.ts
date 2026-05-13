import type { ModelCard } from "~/composables/model/useModelCard";
import {
  modelsPageLimit,
  modelsQuerySchema,
  type ModelsFilters,
  type ModelSortBy,
  type ModelsQuery,
} from "~/forms/models";

export type { ModelSortBy, ModelsQuery };

interface UseModelsOptions {
  filters: Ref<ModelsFilters> | ComputedRef<ModelsFilters>;
}

export default function useModels({ filters }: UseModelsOptions) {
  const { GET } = useApi();
  const page = ref(0);

  const key = computed(() => `models-${page.value}-${JSON.stringify(filters.value)}`);

  const { data, pending, error, refresh } = useAsyncData<{
    rows: ModelCard[];
    totalCount: number;
  } | null>(
    key,
    async () => {
      const query: ModelsQuery = {
        limit: modelsPageLimit,
        page: page.value,
      };
      const params = modelsQuerySchema.parse({ ...filters.value, ...query });
      const res = await GET("/api/v1/models/card", { params: { query: params } });
      const parsed = handleApiError(res.data, res.error, "fetching model query result");
      return { rows: parsed.data, totalCount: parsed.count };
    },
    { watch: [filters, page] },
  );

  const rows = ref(data.value?.rows ?? []);

  onMounted(() => {
    watch(data, (newData) => {
      if (page.value === 0) {
        rows.value = newData?.rows ?? [];
      } else if (newData?.rows) {
        rows.value = [...rows.value, ...newData.rows];
      }
    });
  });

  const totalCount = computed(() => data.value?.totalCount ?? 0);
  const totalPages = computed(() => Math.ceil(totalCount.value / modelsPageLimit));
  const hasMore = computed(
    () => rows.value.length < totalCount.value && page.value < totalPages.value - 1,
  );
  const isEmpty = computed(() => !pending.value && rows.value.length === 0);

  function nextPage() {
    if (hasMore.value) page.value += 1;
  }

  return {
    page,
    rows,
    totalCount,
    pending,
    error,
    hasMore,
    isEmpty,
    refresh,
    nextPage,
  };
}
