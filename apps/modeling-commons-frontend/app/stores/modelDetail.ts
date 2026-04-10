export interface ModelDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  latestVersionId: string | null;
  parentModelId: string | null;
  parentVersionId: string | null;
  visibility: string;
  isEndorsed: boolean;
}

export interface ModelVersion {
  id: string;
  modelId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  nlogoxFileId: string;
  netlogoVersion: string | null;
  infoTab: string | null;
  createdAt: string;
  isFinalized: boolean;
}

export interface ModelAuthor {
  modelId: string;
  userId: string;
  role: string;
  createdAt: string;
  userName?: string;
  userImage?: string;
}

export interface ModelTag {
  id: string;
  name: string;
}

interface ModelDetailState {
  model: ModelDetail | null;
  currentVersion: ModelVersion | null;
  versions: ModelVersion[];
  authors: ModelAuthor[];
  tags: ModelTag[];
  loading: boolean;
  error: string | null;
}

export const useModelDetailStore = defineStore("modelDetail", {
  state: (): ModelDetailState => ({
    model: null,
    currentVersion: null,
    versions: [],
    authors: [],
    tags: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchModel(id: string) {
      this.loading = true;
      this.error = null;

      try {
        const { GET } = useApi();

        const [modelRes, versionsRes, authorsRes] = await Promise.all([
          GET("/api/v1/models/{id}", { params: { path: { id } } }),
          GET("/api/v1/models/{id}/versions", { params: { path: { id }, query: { limit: 50 } } }),
          GET("/api/v1/models/{id}/authors", { params: { path: { id } } }),
        ]);

        if (modelRes.error) {
          this.error = "Model not found";
          return;
        }

        this.model = modelRes.data as unknown as ModelDetail;

        const versionsData = versionsRes.data as { data: ModelVersion[] } | undefined;
        this.versions = versionsData?.data ?? [];

        if (this.versions.length > 0) {
          this.currentVersion = this.versions[0]!;
          await this.fetchTags(id, this.currentVersion.versionNumber);
        }

        const authorsData = authorsRes.data as ModelAuthor[] | undefined;
        this.authors = authorsData ?? [];

        await this.enrichAuthors();
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Failed to fetch model";
      } finally {
        this.loading = false;
      }
    },

    async fetchTags(modelId: string, versionNumber: number) {
      try {
        const { GET } = useApi();
        const { data } = await GET("/api/v1/models/{id}/versions/{version}/tags", {
          params: { path: { id: modelId, version: versionNumber } },
        });

        this.tags = (data as ModelTag[] | undefined) ?? [];
      } catch {
        this.tags = [];
      }
    },

    async enrichAuthors() {
      const { GET } = useApi();

      this.authors = await Promise.all(
        this.authors.map(async (author) => {
          try {
            const { data } = await GET("/api/v1/users/{id}", {
              params: { path: { id: author.userId } },
            });

            const userData = data as { name?: string; image?: string } | undefined;
            return {
              ...author,
              userName: userData?.name,
              userImage: userData?.image ?? undefined,
            };
          } catch {
            return author;
          }
        }),
      );
    },

    async selectVersion(versionNumber: number) {
      const version = this.versions.find((v) => v.versionNumber === versionNumber);
      if (version && this.model) {
        this.currentVersion = version;
        await this.fetchTags(this.model.id, versionNumber);
      }
    },

    clear() {
      this.model = null;
      this.currentVersion = null;
      this.versions = [];
      this.authors = [];
      this.tags = [];
      this.loading = false;
      this.error = null;
    },
  },
});
