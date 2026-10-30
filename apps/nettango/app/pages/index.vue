<template>
  <UPage class="landing no-stylized-heading">
    <section aria-labelledby="hero-title" class="relative overflow-hidden bg-wall">
      <div
        class="mx-auto grid max-w-hero items-center gap-12 px-4 pt-10 pb-16 sm:px-8 lg:min-h-hero lg:grid-cols-hero lg:gap-12 min-[90rem]:gap-24 lg:px-12 lg:py-10 2xl:px-0"
      >
        <div class="max-w-hero-copy mx-auto">
          <h1
            id="hero-title"
            class="mt-6! text-display-sm text-highlighted text-center sm:text-display-hero lg:text-left -tracking-normal"
          >
            <span v-for="(line, index) in page.hero.titleLines" :key="index" class="block text-balance">
              <template v-for="word in line" :key="word">
                <NtBlock
                  v-if="word === page.hero.blockWord"
                  as="span"
                  size="display"
                  color="red"
                  motion="drop"
                  :label="word"
                />
                <template v-else>{{ word }}</template>
                {{ " " }}
              </template>
            </span>
          </h1>

          <div class="wall-clear mt-8">
            <p class="max-w-lede text-lede px-5 text-center md:text-left md:px-0 text-toned sm:text-lede-lg">
              {{ ledeStart }}<ULink
                :to="page.hero.netlogo.to"
                external
                target="_blank"
                rel="noopener"
                class="inline-flex items-baseline gap-1 whitespace-nowrap font-medium text-highlighted underline decoration-slate-900/25 underline-offset-4 hover:decoration-primary"
              ><UIcon name="netlogo-turtles" class="size-5 self-center" aria-hidden="true" />{{ page.hero.netlogo.label }}</ULink>{{ ledeEnd }}
            </p>

            <div class="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-5">
              <UButton size="xl" :to="page.cta.to" :label="page.cta.label" />
              <NuxtLink
                :to="heroLink"
                class="text-base font-semibold whitespace-nowrap text-highlighted underline decoration-slate-900/30 decoration-2 underline-offset-6 hover:decoration-primary"
              >
                {{ page.hero.secondary.label }}
              </NuxtLink>
            </div>

            <p class="mt-8 text-sm text-toned text-center md:text-left">
              {{ page.hero.builder.text }}
              <ULink
                :to="TUTORIAL_PATH"
                class="font-medium text-highlighted underline decoration-slate-900/25 underline-offset-4 hover:decoration-primary"
              >
                {{ page.hero.builder.label }}
              </ULink>
            </p>
          </div>
        </div>

        <HeroModel :model="heroModel" :video="page.hero.video" class="px-5 md:px-0" />
      </div>
    </section>

    <UPageSection
      id="how-it-works"
      :title="page.howItWorks.title"
      :description="page.howItWorks.description"
    >
      <div class="grid gap-12 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:items-start">
        <div>
          <NtBlockStack :blocks="HOW_IT_WORKS_PROGRAM" motion="none" class="mx-auto w-full max-w-sm" />
          <p class="mx-auto mt-8 max-w-2xl text-center text-muted xl:text-left">
            {{ page.howItWorks.example }}
            <ULink :to="page.howItWorks.link.to" class="text-primary underline">
              {{ page.howItWorks.link.label }}
            </ULink>
          </p>
        </div>

        <div class="grid gap-6 sm:grid-cols-3">
          <UCard
            v-for="card in showcase"
            :key="card.model.id"
            as="article"
            class="flex h-full flex-col"
            :ui="{ header: 'p-0 sm:px-0', body: 'flex flex-1 flex-col gap-2' }"
          >
            <template #header>
              <NtLoopVideo
                :src="card.video.src"
                :poster="card.video.poster"
                :label="card.label"
                class="aspect-square w-full"
              />
            </template>
            <h3 class="text-lg font-semibold text-highlighted">{{ card.model.title }}</h3>
            <p class="text-sm text-muted">{{ card.text }}</p>
            <UButton :to="getModelPath(card.model.id)" icon="i-lucide-play" class="mt-auto self-start">
              {{ page.showcase.action }}<span class="sr-only">: {{ card.model.title }}</span>
            </UButton>
          </UCard>
        </div>
      </div>
    </UPageSection>

    <UPageSection
      id="topics"
      :title="page.topics.title"
    >
      <UPageGrid>
        <TopicTile
          v-for="group in topics"
          :key="group.id"
          :group="group"
          :lead="group.models[0]!"
        />
      </UPageGrid>
      <p class="mt-2 text-center">
        <UButton variant="ghost" to="/models-library" icon="lucide:arrow-right">
          {{ page.topics.link }}
        </UButton>
      </p>
    </UPageSection>

    <UPageSection id="start" :ui="{ root: 'bg-wall' }">
      <div class="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
          {{ page.closing.statement }}
        </h2>
        <UButton
          size="xl"
          :to="heroLink"
          :label="page.hero.secondary.label"
          class="max-w-full"
          :ui="{ label: 'whitespace-normal text-center' }"
        />
        <div class="mt-4 flex flex-col items-center gap-3">
          <p class="text-sm text-muted">{{ page.closing.platforms.text }}</p>
          <ul aria-label="Devices and browsers" class="m-0 flex flex-wrap justify-center gap-x-4 gap-y-3 p-0">
            <li v-for="platform in page.closing.platforms.icons" :key="platform.label" class="m-0 flex">
              <UIcon :name="platform.icon" :title="platform.label" class="size-6 text-toned" />
              <span class="sr-only">{{ platform.label }}</span>
            </li>
          </ul>
        </div>
      </div>
    </UPageSection>

    <UPageSection
      id="faq"
      :title="page.faq.title"
    >
      <UAccordion :items="page.faq.items" class="mx-auto max-w-3xl">
        <template #body="{ item }">
          <p class="text-muted">
            {{ item.answer }}
            <ULink v-if="item.action" :to="item.action.to" class="text-primary underline">
              {{ item.action.label }}
            </ULink>
          </p>
        </template>
      </UAccordion>
    </UPageSection>

    <UPageSection
      id="designers"
      orientation="horizontal"
      :title="page.designers.title"
      :description="page.designers.description"
      :ui="{
        root: 'focus-on-dark blueprint-grid border-t-0 bg-nt-blue-950 text-white',
        container: 'lg:items-center',
        title: 'text-white!',
        description: 'text-nt-blue-200',
      }"
    >
      <template #links>
        <UButton size="lg" :label="page.designers.tutorial.label" :to="TUTORIAL_PATH" />
        <UButton
          size="lg"
          :label="page.designers.builder.label"
          :to="page.designers.builder.to"
          target="_blank"
          color="neutral"
          variant="subtle"
          trailing-icon="i-lucide-arrow-up-right"
        />
        <p class="basis-full text-sm text-nt-blue-200">
          {{ page.designers.shorter.lead }}
          <ULink
            :to="page.designers.shorter.to"
            external
            target="_blank"
            rel="noopener"
            class="font-medium text-white! underline decoration-white/30 underline-offset-4 hover:decoration-white"
          >
            {{ page.designers.shorter.label }}
          </ULink>
          {{ page.designers.shorter.trail }}
        </p>
      </template>
      <figure class="m-0 overflow-hidden rounded-xl border border-nt-blue-700 bg-nt-blue-900 shadow-screen">
        <div class="flex items-center gap-2 border-b border-nt-blue-700 px-4 py-2.5 text-xs text-nt-blue-200">
          <UIcon name="i-lucide-blocks" class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ page.designers.file }}</span>
        </div>
        <div class="dot-grid bg-nt-blue-50 px-6 py-8 sm:px-10">
          <NtBlockStack
            :blocks="SETUP_PROGRAM"
            motion="none"
            role="img"
            :aria-label="page.designers.blocksLabel"
            class="mx-auto w-full max-w-sm"
          />
        </div>
        <figcaption class="border-t border-nt-blue-700 px-4 py-2.5 text-xs text-nt-blue-200">
          {{ page.designers.caption }}
        </figcaption>
      </figure>
    </UPageSection>

  </UPage>
</template>

<script setup lang="ts">
import type { GalleryModel } from "~/composables/useModels";
import { SETUP_PROGRAM } from "~/data/blocks/setup";
import { HOW_IT_WORKS_PROGRAM } from "~/data/blocks/steps";

const HERO_MODEL_ID = "ants";

const { data } = await useAsyncData("home", () => queryCollection("home").first());
if (!data.value) {
  throw createError({ statusCode: 500, statusMessage: "The home page content is missing" });
}
const page = data.value;

const models = useModels();
const getModelById = (id: string): GalleryModel => models.find((model) => model.id === id)!;

const heroModel = getModelById(HERO_MODEL_ID);
const heroLink = getModelPath(HERO_MODEL_ID);

const curatedIds = new Set(useModelCuration().groups.map((group) => group.id));
const topics = useModelGroups().filter((group) => curatedIds.has(group.id));

const showcase = page.showcase.cards.map(({ id, ...card }) => ({ model: getModelById(id), ...card }));

const [ledeStart, ledeEnd] = page.hero.description.split(page.hero.netlogo.label);

useHead({ titleTemplate: "%s" });
usePageSeo({ title: page.title, description: page.hero.description });
defineOgImage("SiteSeo", {
  title: page.hero.titleLines.flat().join(" "),
  description: page.hero.description,
});
</script>
