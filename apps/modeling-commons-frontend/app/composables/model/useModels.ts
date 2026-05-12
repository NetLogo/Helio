import { type QueryRecord, readQueryParams } from "@repo/utils/lib/http/query";
import type { ModelCard } from "~/composables/model/useModelCard";
import {
  modelsPageLimit,
  modelsQueryFilters,
  modelsQuerySchema,
  type ModelDateRangeKey,
  type ModelsFilters,
  type ModelsQuery,
  type ModelSortBy,
} from "~/forms/models";

export type { ModelDateRangeKey, ModelsFilters, ModelsQuery, ModelSortBy };

export default function useModels() {
  const { GET } = useApi();
  const route = useRoute();
  const page = useState("models-page", () => 0);

  const filters = computed(() => readQueryParams(route.query as QueryRecord, modelsQueryFilters));
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
  const instanceKey = computed(() => JSON.stringify(filters.value));

  async function setFilter<K extends keyof ModelsFilters>(key: K, value: ModelsFilters[K]) {
    page.value = 0;
    const next = { ...route.query };

    switch (key) {
      case "sortBy":
        if (value === null) delete next.sortBy;
        else next.sortBy = String(value);
        break;
      case "tags":
        if (!value || (Array.isArray(value) && value.length === 0)) {
          next.tag = [];
        } else next.tag = Array.isArray(value) ? [...value] : [String(value)];
        break;
      default:
        if (value === null || value === undefined || value === "") {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete next[key];
        } else next[key] = String(value);
    }

    await navigateTo({ query: next });
  }

  async function setDateRange(stringOrDate: string | Date | number | null, key: ModelDateRangeKey) {
    const next = { ...route.query };
    if (!stringOrDate) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete next[key];
    } else {
      const date =
        typeof stringOrDate === "string" || typeof stringOrDate === "number"
          ? new Date(stringOrDate)
          : stringOrDate;
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date provided for ${key}:`, stringOrDate);
        return;
      }

      const dateText = date.toISOString().split("T")[0];
      if (next[key] === dateText) return;
      if (dateText) {
        next[key] = dateText;
      }
    }
    page.value = 0;
    await navigateTo({ query: next });
  }

  function nextPage() {
    if (hasMore.value) page.value += 1;
  }

  async function resetFilters() {
    page.value = 0;
    await navigateTo({ query: {} });
  }

  return {
    rows,
    totalCount,
    filters,
    pending,
    error,
    hasMore,
    isEmpty,
    refresh,
    setFilter,
    setDateRange,
    nextPage,
    instanceKey,
    resetFilters,
  };
}
