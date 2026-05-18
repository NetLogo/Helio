<template>
  <div>
    <!-- <div
      class="flex flex-col w-full justify-center p-5 gap-4 py-10 px-61 min-h-100 bg-royal-blue-light/10"
    >
      <span class="text-sm text-royal-blue font-bold uppercase">The Modeling Commons</span>
      <h5 class="text-4xl sm:text-5xl max-w-4xl leading-tight tracking-tight">
        Discover, share, and learn about
        <span class="text-royal-blue">complex systems</span> together
      </h5>
      <div class="flex flex-col lg:flex-row gap-4 lg:gap-8 items-center w-full">
        <SearchBar
          class="max-w-md md:max-w-3xl"
          @keydown.enter="
            (e: KeyboardEvent) =>
              navigateTo(`/models?keyword=${(e.target as HTMLInputElement).value}`)
          "
        />

        <span class="text-md text-royal-blue"> OR </span>

        <UButton
          variant="solid"
          color="secondary"
          icon="i-lucide-shuffle"
          @click="navigateToRandomModel()"
        >
          Random
        </UButton>
      </div>
    </div> -->
    <div
      class="flex flex-col lg:flex-row gap-10 px-10 py-10 bg-linear-to-t from-white via-coral-lighter/10 to-royal-blue/15"
    >
      <div class="flex flex-col w-full justify-center p-5 gap-4">
        <span class="text-sm text-royal-blue font-bold uppercase">The Modeling Commons</span>
        <h5 class="text-4xl sm:text-5xl max-w-4xl leading-tight tracking-tight">
          Discover, share, and learn about
          <span class="text-royal-blue">complex systems</span> together
        </h5>
        <div class="flex flex-col lg:flex-row gap-4 lg:gap-8 items-center justify-center w-full">
          <SearchBar
            class="max-w-md md:max-w-3xl"
            @keydown.enter="
              (e: KeyboardEvent) =>
                navigateTo(`/models?keyword=${(e.target as HTMLInputElement).value}`)
            "
          />

          <span class="text-md text-royal-blue"> OR </span>

          <UButton
            variant="solid"
            color="secondary"
            icon="i-lucide-shuffle"
            @click="navigateToRandomModel()"
          >
            Random
          </UButton>
        </div>
      </div>
      <MarqueeGallery class="lg:w-5xl" height="80dvh" column-gap="12px">
        <MarqueeColumn
          v-for="(col, ci) in marqueeColumns"
          :key="ci"
          :direction="ci % 2 === 0 ? 'up' : 'down'"
          :speed="40 + ci * 10"
          width="300px"
          gap="12px"
        >
          <MarqueeCard
            v-for="item in col"
            :key="item.kind === 'model' ? item.card.model.id : item.tag.id"
            width="290px"
            no-shimmer
          >
            <ModelCard v-if="item.kind === 'model'" :card="item.card" />
            <TagCard v-else v-bind="item.tag" :description="item.description" class="p-3" />
          </MarqueeCard>
        </MarqueeColumn>
      </MarqueeGallery>
    </div>

    <!-- <UPageHero
      class="flex items-center h-200"
      title="Discover, share, and learn about complex systems together"
      :ui="{
        header: 'flex flex-col items-center gap-6',
        title: 'text-4xl sm:text-5xl text-royal-blue-lighter max-w-5xl leading-tight px-5',
      }"
    >
      <NuxtImg
        src="/hero.gif"
        class="max-w-500 mx-auto w-full h-full absolute inset-0 object-cover lg:p-10 lg:rounded-[3rem] overflow-hidden z-[-1] brightness-50"
        :placeholder="[60, 40]"
      />
      <template #description>
        <p class="font-heading text-md text-white">
          With more than 1,000 models, contributed by modelers from around the world, you're bound
          to learn something new.
        </p>
      </template>
      <template #body>
        <div class="flex flex-col lg:flex-row gap-4 lg:gap-8 items-center justify-center px-5">
          <SearchBar
            class="max-w-md md:max-w-3xl"
            variant="none"
            @keydown.enter="
              (e: KeyboardEvent) =>
                navigateTo(`/models?keyword=${(e.target as HTMLInputElement).value}`)
            "
          />

          <span class="text-md text-royal-blue-lighter"> OR </span>

          <UButton
            variant="solid"
            color="secondary"
            icon="i-lucide-shuffle"
            @click="navigateToRandomModel()"
          >
            Random
          </UButton>
        </div>
      </template>
    </UPageHero> -->

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

      <Error
        v-else-if="error"
        title="Unable to load models"
        message="Something went wrong while fetching models. Please refresh the page or try again later."
      >
        <UButton variant="outline" @click="refresh()"> Try again </UButton>
      </Error>

      <div v-else-if="data" class="flex flex-col gap-25">
        <template v-for="(section, idx) in visibleSections" :key="section.key">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <section
              class="space-y-6"
              :class="{
                'col-span-3': idx === 1,
                'col-span-4': idx !== 1,
              }"
            >
              <div class="flex items-center justify-between">
                <!-- @replace -->
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
              <!-- @replace -->
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
            <!-- @extract -->
            <section v-if="idx === 1" class="space-y-6 h-full col-span-1 mb-20">
              <div>
                <h5 class="tracking-tight">Trending Tags</h5>
                <p class="text-sm text-muted mt-1">(in the past 2 weeks)</p>
              </div>
              <UCard variant="soft">
                <div v-if="tagsSummary?.data" class="flex flex-col gap-8 h-full">
                  <TagCard
                    v-for="data in tagsSummary?.data"
                    :key="data.tag.id"
                    :name="data.tag.displayName"
                    :description="`tagged ${data.modelCount} times`"
                  />

                  <UButton variant="link" size="sm" class="w-full mt-4" to="/tags">
                    See all tags
                  </UButton>
                </div>
                <div v-else-if="tagsStatus === 'pending'" class="flex flex-col gap-8 h-full">
                  <TagCardSkeleton v-for="i in 6" :key="i" />
                </div>
                <div v-else-if="tagsError" class="text-center py-8">
                  <Error :error="tagsError" title="Something went wrong" />
                </div>
              </UCard>
            </section>
          </div>
        </template>

        <Empty
          v-if="visibleSections.length === 0"
          icon="i-lucide-package-open"
          title="No models yet"
          description="Be the first to share a simulation with the community."
        />
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { ModelCard } from "~/composables/model/useModelCard";

type SortBy = "recent" | "views" | "downloads" | "runs" | "likes";

interface SectionConfig {
  key: string;
  title: string;
  subtitle: string;
  query: QueryParams<"GET", "/api/v1/models/card">;
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
    viewAllTo: "/featured-models",
  },
  {
    key: "recent",
    title: "Recent Models",
    subtitle: "Latest uploads from the community",
    query: { limit: 8 },
    viewAllTo: "/new-models",
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

const api = useApi();
const { data, error, status, refresh } = await useAsyncData<Record<string, ModelCard[]>>(
  "home-models",
  async () => {
    const responses = await Promise.all(
      sectionConfigs.map((s) => api.GET("/api/v1/models/card", { params: { query: s.query } })),
    );

    return Object.fromEntries(
      sectionConfigs
        .map((s, i) => [s.key, (responses[i]?.data?.data ?? []) as ModelCard[]] as const)
        .filter(([, cards]) => cards.length > 0),
    );
  },
);

const TWO_WEEKS_MS = 1000 * 60 * 60 * 24 * 14;
const {
  data: tagsSummary,
  error: tagsError,
  status: tagsStatus,
} = await useAsyncData("home-tags-summary", () => {
  return getPopularTagsSummary(api, {
    pagination: { limit: 6 },
    date: { fromDate: new Date(Date.now() - TWO_WEEKS_MS) }, // past 2 weeks
  });
});

const visibleSections = computed(() =>
  sectionConfigs
    .map((s) => ({ ...s, cards: data.value?.[s.key] ?? [] }))
    .filter((s) => s.cards.length > 0),
);

const MARQUEE_COLS = 3;

const marqueeColumns = computed(() => {
  // Flatten all section cards with their section metadata
  const allCards = visibleSections.value.flatMap((section) =>
    section.cards.map((card) => ({ card, sectionTitle: section.title, kind: "model" as const })),
  );

  const tagsCards = tagsSummary.value?.data.map((tagData: TagsSummary["data"][number]) => ({
    kind: "tag" as const,
    tag: tagData.tag,
    description: `tagged ${tagData.modelCount} times`,
  }));

  // Round-robin distribute across columns
  const cols: Array<
    Array<
      | { card: ModelCard; sectionTitle: string; kind: "model" }
      | { kind: "tag"; tag: TagsSummary["data"][number]["tag"]; description: string }
    >
  > = Array.from({ length: MARQUEE_COLS }, () => []);

  const mixedCards = (tagsCards ? [...allCards, ...tagsCards] : allCards).sort(
    () => Math.random() - 0.5,
  ); // Shuffle to mix tags and models

  mixedCards.forEach((item, i) => {
    cols[i % MARQUEE_COLS]!.push(item);
  });

  return cols;
});
</script>
