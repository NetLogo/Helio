interface ModelListRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  latestVersionNumber: number | null;
  parentModelId: string | null;
  parentVersionNumber: number | null;
  visibility: string;
  isEndorsed: boolean;
  title?: string;
  description?: string | null;
  previewImageUri?: string | null;
}

interface ModelsListBody {
  count: number;
  limit: number;
  page: number;
  data: ModelListRow[];
}

interface ModelsFilters {
  keyword: string;
  tag: string | null;
  isEndorsed: boolean | null;
}

const PAGE_LIMIT = 20;

function readFilters(query: Record<string, string | string[] | undefined>): ModelsFilters {
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] ?? "" : v ?? "";
  const endorsedRaw = first(query.endorsed);
  return {
    keyword: first(query.keyword),
    tag: first(query.tag) || null,
    isEndorsed: endorsedRaw === "true" ? true : endorsedRaw === "false" ? false : null,
  };
}

export default function useModels() {
  const { GET } = useApi();
  const route = useRoute();
  const page = useState("models-page", () => 0);

  const filters = computed(() => readFilters(route.query as Record<string, string>));

  const { data, pending, error, refresh } = useAsyncData<{
    rows: ModelListRow[];
    totalCount: number;
  } | null>(
    "models-list",
    async () => {
      const query: QueryParams<"GET", "/api/v1/models"> = {
        limit: PAGE_LIMIT,
        page: page.value,
      };
      if (filters.value.keyword) query.keyword = filters.value.keyword;
      if (filters.value.tag) query.tag = filters.value.tag;
      if (filters.value.isEndorsed !== null) query.isEndorsed = filters.value.isEndorsed;

      const res = await GET("/api/v1/models", { params: { query } });
      if (res.error || !res.data) return null;

      const body = res.data as unknown as ModelsListBody;

      const rows: ModelListRow[] = await Promise.all(
        body.data.map(async (model) => {
          if (!model.latestVersionNumber) return model;
          const { data: versions } = await GET("/api/v1/models/{id}/versions", {
            params: { path: { id: model.id }, query: { limit: 1, page: 0 } },
          });
          const versionsData = versions as unknown as {
            data?: Array<{ title: string; description: string | null }>;
          } | undefined;
          const latest = versionsData?.data?.[0];
          return {
            ...model,
            title: latest?.title,
            description: latest?.description,
            previewImageUri: getPreviewImageURI(model.id, model.latestVersionNumber),
          };
        }),
      );

      return { rows, totalCount: body.count };
    },
    { watch: [filters, page] },
  );

  const rows = computed(() => data.value?.rows ?? []);
  const totalCount = computed(() => data.value?.totalCount ?? 0);
  const hasMore = computed(() => rows.value.length < totalCount.value);
  const isEmpty = computed(() => !pending.value && rows.value.length === 0);

  async function setFilter<K extends keyof ModelsFilters>(key: K, value: ModelsFilters[K]) {
    page.value = 0;
    const next = { ...route.query };
    if (key === "isEndorsed") {
      if (value === null) delete next.endorsed;
      else next.endorsed = String(value);
    } else if (value === null || value === "") {
      delete next[key];
    } else {
      next[key] = String(value);
    }
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
    nextPage,
    resetFilters,
  };
}

export type { ModelListRow };
