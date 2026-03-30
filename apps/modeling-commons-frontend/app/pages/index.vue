<template>
  <div>

    <UContainer>
      <!-- Loading State -->
      <section v-if="loading" class="space-y-6">
        <div>
          <div class="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div class="h-4 w-64 bg-slate-100 rounded mt-2 animate-pulse" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ModelCardSkeleton v-for="i in 3" :key="i" />
        </div>
      </section>

      <!-- Featured Models -->
      <section v-if="!loading && featuredModels.length > 0" class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Featured Models</h2>
            <p class="text-sm text-slate-500 mt-1">Community-endorsed simulations</p>
          </div>
          <UButton to="/models" variant="ghost" trailing-icon="i-lucide-arrow-right">
            View all
          </UButton>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ModelCard v-for="model in featuredModels" :key="model.id" :model="model" />
        </div>
      </section>

      <!-- Recent Models -->
      <section v-if="recentModels.length > 0" class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Recent Models</h2>
            <p class="text-sm text-slate-500 mt-1">Latest uploads from the community</p>
          </div>
          <UButton to="/models" variant="ghost" trailing-icon="i-lucide-arrow-right">
            View all
          </UButton>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ModelCard v-for="model in recentModels" :key="model.id" :model="model" />
        </div>
      </section>

      <!-- Empty state when no models exist -->
      <section v-if="!loading && featuredModels.length === 0 && recentModels.length === 0" class="text-center py-16">
        <UIcon name="i-lucide-package-open" class="size-14 text-slate-300 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-slate-600">No models yet</h2>
        <p class="text-slate-400 mt-1">Be the first to share a simulation with the community.</p>
      </section>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { ModelListItem } from "~/stores/models";

const meta = useWebsite();
const user = useUser();

const featuredModels = ref<ModelListItem[]>([]);
const recentModels = ref<ModelListItem[]>([]);
const loading = ref(true);

async function enrichModels(models: ModelListItem[]): Promise<ModelListItem[]> {
  const { GET } = useApi();
  return Promise.all(
    models.map(async (model) => {
      if (!model.latestVersionId) return model;
      try {
        const { data } = await GET("/api/v1/models/{id}/versions", {
          params: { path: { id: model.id }, query: { limit: 1, page: 0 } },
        });
        const versionsData = data as { data: Array<{ title: string; description: string | null }> } | undefined;
        const v = versionsData?.data?.[0];
        if (v) return { ...model, title: v.title, description: v.description };
      } catch { /* skip */ }
      return model;
    }),
  );
}

onMounted(async () => {
  const { GET } = useApi();

  try {
    const [featuredRes, recentRes] = await Promise.all([
      GET("/api/v1/models", { params: { query: { limit: 3, isEndorsed: true } } }),
      GET("/api/v1/models", { params: { query: { limit: 6 } } }),
    ]);

    const toList = (res: typeof featuredRes) => {
      const d = res.data as { data: ModelListItem[] } | undefined;
      return d?.data ?? [];
    };

    const [enrichedFeatured, enrichedRecent] = await Promise.all([
      enrichModels(toList(featuredRes)),
      enrichModels(toList(recentRes)),
    ]);

    featuredModels.value = enrichedFeatured;
    recentModels.value = enrichedRecent;
  } catch {
    // Silently handle — empty state will show
  } finally {
    loading.value = false;
  }
});
</script>
