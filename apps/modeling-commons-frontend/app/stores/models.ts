export interface ModelListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  latestVersionNumber: number | null;
  parentModelId: string | null;
  visibility: string;
  isEndorsed: boolean;
  title?: string;
  description?: string | null;
  previewImageUri?: string | null;
}

interface ModelsFilters {
  keyword: string;
  visibility: "public" | "private" | "unlisted" | null;
  tag: string | null;
  isEndorsed: boolean | null;
}

interface ModelsState {
  models: ModelListItem[];
  totalCount: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  filters: ModelsFilters;
}

export const useModelsStore = defineStore("models", {
  state: (): ModelsState => ({
    models: [],
    totalCount: 0,
    page: 0,
    limit: 20,
    loading: false,
    error: null,
    filters: {
      keyword: "",
      visibility: null,
      tag: null,
      isEndorsed: null,
    },
  }),

  getters: {
    hasMore: (state) => state.models.length < state.totalCount,
    isEmpty: (state) => state.models.length === 0 && !state.loading,
  },

  actions: {
    async fetchModels(append = false) {
      this.loading = true;
      this.error = null;

      try {
        const { GET } = useApi();
        const query: QueryParams<"GET", "/api/v1/models"> = {
          limit: this.limit,
          page: this.page,
        };

        if (this.filters.keyword) query.keyword = this.filters.keyword;
        if (this.filters.tag) query.tag = this.filters.tag;
        if (this.filters.isEndorsed !== null) query.isEndorsed = this.filters.isEndorsed;

        const { data, error } = await GET("/api/v1/models", {
          params: { query },
        });

        if (error) {
          this.error = "Failed to fetch models";
          return;
        }

        const modelsData = data as {
          count: number;
          limit: number;
          page: number;
          data: ModelListItem[];
        };

        this.totalCount = modelsData.count;

        await this.enrichModelsWithVersionData(modelsData.data, append);
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Failed to fetch models";
      } finally {
        this.loading = false;
      }
    },

    async enrichModelsWithVersionData(models: ModelListItem[], append = false) {
      const { GET } = useApi();

      const enriched = await Promise.all(
        models.map(async (model) => {
          if (!model.latestVersionNumber) return model;

          try {
            const { data } = await GET("/api/v1/models/{id}/versions", {
              params: { path: { id: model.id }, query: { limit: 1, page: 0 } },
            });

            const versionsData = data as
              | {
                  data: Array<{ title: string; description: string | null }>;
                }
              | undefined;

            const latestVersion = versionsData?.data?.[0];
            if (latestVersion) {
              return {
                ...model,
                title: latestVersion.title,
                description: latestVersion.description,
                previewImageUri: `${getPreviewImageURI(model.id, model.latestVersionNumber)}`,
              };
            }
          } catch {
            console.warn(`Failed to fetch version data for model ${model.id}`);
          }
          return model;
        }),
      );

      this.models = append ? [...this.models, ...enriched] : enriched;
    },

    setFilter<K extends keyof ModelsFilters>(key: K, value: ModelsFilters[K]) {
      this.filters[key] = value;
      this.page = 0;
      this.fetchModels();
    },

    nextPage() {
      if (this.hasMore) {
        this.page++;
        this.fetchModels(true);
      }
    },

    resetFilters() {
      this.filters = { keyword: "", visibility: null, tag: null, isEndorsed: null };
      this.page = 0;
      this.fetchModels();
    },
  },
});
