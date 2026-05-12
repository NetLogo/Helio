import { type QueryKey, type QueryRecord, readQueryParams } from "@repo/utils/lib/http/query";
import * as z from "zod";
import type { ModelCard } from "~/composables/model/useModelCard";

export type ModelQuery = QueryParams<"GET", "/api/v1/models/card">;
export type ModelsFilters = Omit<ModelQuery, "limit" | "page">;
export type ModelSortBy = NonNullable<ModelsFilters["sortBy"]>;
const SORT_BY_VALUES: Readonly<Array<ModelSortBy>> = [
  "recent",
  "views",
  "downloads",
  "runs",
  "likes",
];
const PAGE_LIMIT = 20;

const queryFilters = [
  { key: "keyword", type: "string", defaultValue: "" },
  { key: "tags", type: "array", contentType: { key: "tag", type: "string" } },
  { key: "isEndorsed", type: "boolean" },
  { key: "isLibraryModel", type: "boolean" },
  { key: "sortBy", type: "string" },
  { key: "order", type: "string", defaultValue: "desc" },
  { key: "fromDate", type: "string" },
  { key: "toDate", type: "string" },
  { key: "authorId", type: "string" },
  { key: "parentModelId", type: "string" },
  { key: "publicOnly", type: "boolean" },
  { key: "netlogoVersion", type: "string" },
] as const satisfies Array<QueryKey>;

const querySchema = z.object({
  limit: z.number(),
  page: z.number(),
  keyword: z.string().default(""),
  tags: z.array(z.string()).default([]),
  sortBy: z.enum(SORT_BY_VALUES).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  authorId: z.string().optional(),
  parentModelId: z.string().optional(),
  publicOnly: z.boolean().optional(),
  isEndorsed: z.boolean().optional(),
  isLibraryModel: z.boolean().optional(),
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),
  netlogoVersion: z.string().optional(),
});

export default function useModels() {
  const { GET } = useApi();
  const route = useRoute();
  const page = useState("models-page", () => 0);

  const filters = computed(() => readQueryParams(route.query as QueryRecord, queryFilters));
  const key = computed(() => `models-${page.value}-${JSON.stringify(filters.value)}`);

  const { data, pending, error, refresh } = useAsyncData<{
    rows: ModelCard[];
    totalCount: number;
  } | null>(
    key,
    async () => {
      const query: QueryParams<"GET", "/api/v1/models/card"> = {
        limit: PAGE_LIMIT,
        page: page.value,
      };
      const params = querySchema.parse({ ...filters.value, ...query });
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
  const totalPages = computed(() => Math.ceil(totalCount.value / PAGE_LIMIT));
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

  async function setDateRange(
    stringOrDate: string | Date | number | null,
    key: "fromDate" | "toDate",
  ) {
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
