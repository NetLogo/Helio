<template>
  <div>
    <UPageHero :title="meta.name">
      <template #title>
        <component :is="meta.logo" class="max-w-md lg:max-w-2xl mx-auto" />
      </template>
      <template #description>
        <p
          v-for="(paragraph, index) in meta.description.split('\n\n')"
          :key="index"
          class="text-md"
        >
          {{ paragraph }}
        </p>
      </template>
      <template #body>
        <div class="flex flex-col lg:flex-row gap-4 lg:gap-8 items-center justify-center">
          <SearchBar
            class="max-w-md md:max-w-3xl"
            @keydown.enter="
              (e: KeyboardEvent) =>
                navigateTo(`/models?keyword=${(e.target as HTMLInputElement).value}`)
            "
          />

          <span class="text-md text-muted"> OR </span>

          <UButton variant="outline" icon="i-lucide-shuffle"> Random </UButton>
        </div>
      </template>
    </UPageHero>

    <UContainer>
      <div v-if="status === 'pending'" class="space-y-12">
        <section v-for="i in 2" :key="i" class="space-y-6">
          <div>
            <div class="h-8 w-48 bg-accented rounded animate-pulse" />
            <div class="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <ModelCardSkeleton v-for="j in 4" :key="j" />
          </div>
        </section>
      </div>

      <div v-else-if="error" class="text-center py-16">
        <UIcon name="i-lucide-wifi-off" class="size-14 text-dimmed mx-auto mb-4" />
        <h2 class="text-toned">Unable to load models</h2>
        <p class="text-muted mt-1">We couldn't reach the server. Please try again.</p>
        <UButton variant="outline" class="mt-4" @click="refresh()"> Try again </UButton>
      </div>

      <template v-else-if="data">
        <template v-for="(section, idx) in visibleSections" :key="section.key">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <section
              class="space-y-6"
              :class="{
                'mt-12': idx > 0,
                'col-span-3': idx === 1,
                'col-span-4': idx !== 1,
              }"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h5 class="tracking-tight">{{ section.title }}</h5>
                  <p class="text-sm text-muted mt-1">{{ section.subtitle }}</p>
                </div>
                <UButton
                  :to="section.viewAllTo"
                  variant="ghost"
                  trailing-icon="i-lucide-arrow-right"
                >
                  View all
                </UButton>
              </div>
              <div
                class="grid grid-cols-1 sm:grid-cols-2 gap-8"
                :class="{
                  'lg:grid-cols-3': idx === 1,
                  'lg:grid-cols-4': idx !== 1,
                }"
              >
                <ModelCard v-for="card in section.cards" :key="card.model.id" :card="card" />
              </div>
            </section>
            <section v-if="idx === 1" class="space-y-6 h-full col-span-1 pt-12 mb-20">
              <div>
                <h5 class="tracking-tight">Trending Tags</h5>
                <p class="text-sm text-muted mt-1">(in the past 2 weeks)</p>
              </div>
              <UCard variant="soft">
                <div class="flex flex-col gap-8 h-full">
                  <TagCard name="Camouflage" description="tagged 21 times" />
                  <TagCard name="Research" description="tagged 12 times" />
                  <TagCard name="Ecology" description="tagged 14 times" />
                  <TagCard name="GIS" description="tagged 7 times" />
                  <TagCard name="Code Example" description="tagged 3 times" />
                  <TagCard name="Work-in-progress" description="tagged 1 time" />

                  <UButton variant="link" size="sm" class="w-full mt-4" to="/tags">
                    See all 52 tags
                  </UButton>
                </div>
              </UCard>
            </section>
          </div>
        </template>

        <section v-if="visibleSections.length === 0" class="text-center py-16">
          <UIcon name="i-lucide-package-open" class="size-14 text-dimmed mx-auto mb-4" />
          <h2 class="text-lg font-semibold text-toned">No models yet</h2>
          <p class="text-dimmed mt-1">Be the first to share a simulation with the community.</p>
        </section>
      </template>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { ModelCard } from "~/composables/useModelCard";

type SortBy = "recent" | "views" | "downloads" | "runs" | "likes";

interface SectionConfig {
  key: string;
  title: string;
  subtitle: string;
  query: QueryParams<"GET", "/api/v1/models">;
  viewAllTo: string;
}

const meta = useWebsite();

useSeoMeta({
  title: meta.value.fullName,
  description: meta.value.description,
  ogTitle: meta.value.fullName,
  ogDescription: meta.value.description,
});

const sectionConfigs: SectionConfig[] = [
  {
    key: "featured",
    title: "Featured Models",
    subtitle: "Community-endorsed simulations",
    query: { limit: 6, isEndorsed: true },
    viewAllTo: "/models?endorsed=true",
  },
  {
    key: "recent",
    title: "Recent Models",
    subtitle: "Latest uploads from the community",
    query: { limit: 8 },
    viewAllTo: "/models",
  },
  {
    key: "most-viewed",
    title: "Most Viewed Models",
    subtitle: "What the community keeps coming back to",
    query: { limit: 6, sortBy: "views" satisfies SortBy },
    viewAllTo: "/models?sortBy=views",
  },
  {
    key: "most-downloaded",
    title: "Most Downloaded Models",
    subtitle: "Top picks people are taking offline",
    query: { limit: 4, sortBy: "downloads" satisfies SortBy },
    viewAllTo: "/models?sortBy=downloads",
  },
  {
    key: "most-liked",
    title: "Most Liked Models",
    subtitle: "Crowd favorites",
    query: { limit: 4, sortBy: "likes" satisfies SortBy },
    viewAllTo: "/models?sortBy=likes",
  },
];

async function fetchCards(api: ReturnType<typeof useApi>, ids: string[]): Promise<ModelCard[]> {
  const cards = await Promise.all(
    ids.map(async (id) => {
      const { data } = await api.GET("/api/v1/models/{id}/card", {
        params: { path: { id } },
      });
      return (data as ModelCard | undefined) ?? null;
    }),
  );
  return cards.filter((c): c is ModelCard => c !== null);
}

const api = useApi();
const { data, error, status, refresh } = await useAsyncData("home-models", async () => {
  const responses = await Promise.all(
    sectionConfigs.map((s) => api.GET("/api/v1/models", { params: { query: s.query } })),
  );

  const idLists = responses.map((res) => {
    const d = res.data as { data: Array<{ id: string }> } | undefined;
    return (d?.data ?? []).map((m) => m.id);
  });

  const cardLists = await Promise.all(idLists.map((ids) => fetchCards(api, ids)));

  return Object.fromEntries(sectionConfigs.map((s, i) => [s.key, cardLists[i]])) as Record<
    string,
    ModelCard[]
  >;
});

const visibleSections = computed(() =>
  sectionConfigs
    .map((s) => ({ ...s, cards: data.value?.[s.key] ?? [] }))
    .filter((s) => s.cards.length > 0),
);
</script>
