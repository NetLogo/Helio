<template>
  <div>
    <div
      class="flex flex-col lg:flex-row gap-10 px-10 py-10 bg-linear-to-t from-white via-coral-lighter/10 to-royal-blue/15"
    >
      <div class="flex flex-col w-full justify-center p-5 gap-4">
        <span class="text-sm sm:text-md md:text-lg text-royal-blue font-bold uppercase">The Modeling Commons</span>
        <h5 class="text-3xl sm:text-5xl max-w-4xl leading-tight tracking-tight">
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

        <NuxtLink to="https://www.netlogo.org/" target="_blank" rel="noopener noreferrer" class="mt-8 text-center lg:text-left text-md">
            Powered by <img :src="NetlogoLogo" alt="NetLogo" class="inline-block h-6 w-auto -mt-0.5 -ml-1" />
        </NuxtLink>
      </div>
      <MarqueeGallery class="lg:w-5xl" height="80dvh" column-gap="12px">
        <MarqueeColumn
          v-for="(col, ci) in marqueeColumns"
          :key="
            col.reduce(
              (acc, item) => acc + (item.kind === 'model' ? item.card.model.id : item.tag.id),
              '',
            )
          "
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
        <template v-for="section in visibleSections" :key="section.key">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <section
              class="space-y-6"
              :class="{
                'col-span-3': section.hasSidebar,
                'col-span-4': !section.hasSidebar,
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
                  <span data-show-from="sm">View all</span>
                </UButton>
              </div>
              <!-- @replace -->
              <div
                class="grid grid-cols-1 sm:grid-cols-2 gap-8"
                :class="{
                  'lg:grid-cols-3': section.hasSidebar,
                  'lg:grid-cols-4': !section.hasSidebar,
                }"
              >
                <template v-if="section.pending">
                  <ModelCardSkeleton v-for="j in section.query.limit ?? 4" :key="j" />
                </template>
                <template v-else>
                  <ModelCard v-for="card in section.cards" :key="card.model.id" :card="card" />
                </template>
              </div>
            </section>
            <!-- @extract -->
            <section v-if="section.hasSidebar" class="space-y-6 h-full col-span-1 mb-20">
              <div>
                <h5 class="tracking-tight">Trending Tags</h5>
                <p class="text-sm text-muted mt-1">(in the past 2 weeks)</p>
              </div>
              <UCard variant="soft">
                <div v-if="feedTags.length" class="flex flex-col gap-8 h-full">
                  <TagCard
                    v-for="entry in feedTags"
                    :key="entry.tag.id"
                    :name="entry.tag.name"
                    :display-name="entry.tag.displayName"
                    :description="`tagged ${pluralizeWithCount(entry.modelCount, 'time')}`"
                  />

                  <UButton variant="link" size="sm" class="w-full mt-4" to="/tags">
                    See all tags
                  </UButton>
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
import NetlogoLogo from "@repo/vue-ui/assets/brands/NetLogoOrgLogo.svg?url";
import {
  homeFeedPath,
  homeRecentPath,
  homeRecentSection,
  homeSections,
  type HomeFeed,
  type HomeModelCard,
  type HomePopularTag,
  type HomeRecentFeed,
} from "~~/shared/home";

const meta = useWebsite();

useSeoMeta({
  title: meta.value.fullName,
  description: meta.value.description,
  ogTitle: meta.value.fullName,
  ogDescription: meta.value.description,
});

// Every section here is public and identical for all visitors, so the queries
// are collapsed into one server-cached feed instead of six per-request calls.
const { data, error, status, refresh } = await useAsyncData<HomeFeed>("home-feed", () =>
  $fetch<HomeFeed>(homeFeedPath),
);

// Recents carry a much shorter TTL than the rest of the feed, so they load on
// their own and never block the sections around them.
const { data: recent, status: recentStatus } = useAsyncData<HomeRecentFeed>(
  "home-recent",
  () => $fetch<HomeRecentFeed>(homeRecentPath),
  { lazy: true },
);

const feedTags = computed<HomePopularTag[]>(() => data.value?.tags ?? []);

const visibleSections = computed(() =>
  homeSections
    .map((s) => {
      const isRecent = s.key === homeRecentSection.key;
      return {
        ...s,
        cards: isRecent ? (recent.value?.cards ?? []) : (data.value?.sections[s.key] ?? []),
        pending: isRecent && recentStatus.value === "pending",
        hasSidebar: isRecent,
      };
    })
    .filter((s) => s.cards.length > 0 || s.pending),
);

const MARQUEE_COLS = 3;

const randomSeed = useState("seed", () => Math.random());
const rand = ref(mulberry32(randomSeed.value));
const marqueeColumns = computed(() => {
  // Recents are excluded: they arrive after the feed, and folding them in later
  // would reshuffle every column under the reader.
  const allCards = visibleSections.value
    .filter((section) => section.key !== homeRecentSection.key)
    .flatMap((section) =>
      section.cards.map((card) => ({ card, sectionTitle: section.title, kind: "model" as const })),
    );

  const tagsCards = feedTags.value.map((entry) => ({
    kind: "tag" as const,
    tag: entry.tag,
    description: `tagged ${pluralizeWithCount(entry.modelCount, "time")}`,
  }));

  // Round-robin distribute across columns
  const cols: Array<
    Array<
      | { card: HomeModelCard; sectionTitle: string; kind: "model" }
      | { kind: "tag"; tag: HomePopularTag["tag"]; description: string }
    >
  > = Array.from({ length: MARQUEE_COLS }, () => []);

  const mixedCards = [...allCards, ...tagsCards].sort(() => rand.value() - 0.5); // Shuffle to mix tags and models

  mixedCards.forEach((item, i) => {
    cols[i % MARQUEE_COLS]!.push(item);
  });

  return cols;
});
</script>
