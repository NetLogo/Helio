import { readQueryParams, type QueryRecord } from "@repo/utils/lib/http/query";
import { modelsQueryFilters, type ModelDateRangeKey, type ModelsFilters } from "~/forms/models";

export type { ModelDateRangeKey, ModelsFilters };

export default function useModelsSearchController() {
  const route = useRoute();

  const filters = computed(
    () => readQueryParams(route.query as QueryRecord, modelsQueryFilters) as ModelsFilters,
  );
  const instanceKey = computed(() => JSON.stringify(filters.value));

  const { page, rows, totalCount, pending, error, hasMore, isEmpty, refresh, nextPage } =
    useForumModels({ filters });

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
