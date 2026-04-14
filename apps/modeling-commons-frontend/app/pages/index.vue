<template>
  <div>
    <section
      class="relative overflow-hidden border-b border-default bg-gradient-to-b from-primary-50/80 to-background"
    >
      <div class="absolute inset-0 opacity-[0.04]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="currentColor"
                stroke-width="0.5"
                class="text-primary-600"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>
      <UContainer class="relative py-16 sm:py-24 text-center">
        <h1 class="text-highlighted">
          {{ meta.name }}
        </h1>
        <p class="mt-4 text-lg text-toned max-w-2xl mx-auto leading-relaxed">
          {{ meta.description }}
        </p>
        <div class="mt-8 flex justify-center gap-3">
          <UButton to="/models" size="lg" variant="solid"> Explore Models </UButton>
          <UButton to="/signup" size="lg"> Join the Community </UButton>
        </div>
      </UContainer>
    </section>

    <UContainer>
      <div v-if="status === 'pending'" class="space-y-12">
        <section class="space-y-6">
          <div>
            <div class="h-8 w-48 bg-accented rounded animate-pulse" />
            <div class="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModelCardSkeleton v-for="i in 3" :key="i" />
          </div>
        </section>
      </div>

      <div v-else-if="error" class="text-center py-16">
        <UIcon name="i-lucide-wifi-off" class="size-14 text-dimmed mx-auto mb-4" />
        <h2 class="ext-toned">Unable to load models</h2>
        <p class="text-muted mt-1">We couldn't reach the server. Please try again.</p>
        <UButton variant="outline" class="mt-4" @click="refresh()"> Try again </UButton>
      </div>

      <template v-else-if="data">
        <section v-if="data.featured.length > 0" class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h5 class="tracking-tight">Featured Models</h5>
              <p class="text-sm text-muted mt-1">Community-endorsed simulations</p>
            </div>
            <UButton to="/models" variant="ghost" trailing-icon="i-lucide-arrow-right">
              View all
            </UButton>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModelCard v-for="model in data.featured" :key="model.id" :model="model" />
          </div>
        </section>

        <section
          v-if="data.recent.length > 0"
          class="space-y-6"
          :class="{ 'mt-12': data.featured.length > 0 }"
        >
          <div class="flex items-center justify-between">
            <div>
              <h5 class="tracking-tight">Recent Models</h5>
              <p class="text-sm text-muted mt-1">Latest uploads from the community</p>
            </div>
            <UButton to="/models" variant="ghost" trailing-icon="i-lucide-arrow-right">
              View all
            </UButton>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <ModelCard v-for="model in data.recent" :key="model.id" :model="model" />
          </div>
        </section>

        <section
          v-if="data.featured.length === 0 && data.recent.length === 0"
          class="text-center py-16"
        >
          <UIcon name="i-lucide-package-open" class="size-14 text-dimmed mx-auto mb-4" />
          <h2 class="text-lg font-semibold text-toned">No models yet</h2>
          <p class="text-dimmed mt-1">Be the first to share a simulation with the community.</p>
        </section>
      </template>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { ModelListItem } from "~/stores/models";

const meta = useWebsite();

useSeoMeta({
  title: meta.value.fullName,
  description: meta.value.description,
  ogTitle: meta.value.fullName,
  ogDescription: meta.value.description,
});

async function enrichModels(models: ModelListItem[]): Promise<ModelListItem[]> {
  const { GET } = useApi();
  return Promise.all(
    models.map(async (model) => {
      if (!model.latestVersionNumber) return model;
      try {
        const { data } = await GET("/api/v1/models/{id}/versions", {
          params: { path: { id: model.id }, query: { limit: 1, page: 0 } },
        });
        const versionsData = data as
          | { data: Array<{ title: string; description: string | null }> }
          | undefined;
        const v = versionsData?.data?.[0];
        if (v)
          return {
            ...model,
            title: v.title,
            description: v.description,
            previewImageUri: getPreviewImageURI(model.id, model.latestVersionNumber),
          };
      } catch {
        /* skip enrichment for this model */
      }
      return model;
    }),
  );
}

const { data, error, status, refresh } = await useAsyncData("home-models", async () => {
  const { GET } = useApi();
  const [featuredRes, recentRes] = await Promise.all([
    GET("/api/v1/models", { params: { query: { limit: 3, isEndorsed: true } } }),
    GET("/api/v1/models", { params: { query: { limit: 6 } } }),
  ]);

  const toList = (res: typeof featuredRes) => {
    const d = res.data as { data: ModelListItem[] } | undefined;
    return d?.data ?? [];
  };

  const [featured, recent] = await Promise.all([
    enrichModels(toList(featuredRes)),
    enrichModels(toList(recentRes)),
  ]);

  return { featured, recent };
});
</script>
