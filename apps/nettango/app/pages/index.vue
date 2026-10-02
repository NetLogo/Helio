<template>
  <UPage class="landing no-stylized-heading">
    <section aria-labelledby="hero-title" class="relative overflow-hidden bg-wall">
      <div
        class="mx-auto grid max-w-hero items-center gap-12 px-4 pt-10 pb-16 sm:px-8 lg:min-h-hero lg:grid-cols-hero lg:gap-10 lg:px-12 lg:py-10 2xl:px-0"
      >
        <div class="max-w-hero-copy mx-auto">
          <h1
            id="hero-title"
            class="mt-6! text-display-md text-highlighted text-center lg:text-left xl:text-display-lg -tracking-normal"
          >
            <span v-for="(line, index) in page.hero.titleLines" :key="index" class="block">
              <template v-for="word in line" :key="word">
                <NtBlock
                  v-if="word === HERO_BLOCK_WORD"
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

          <p class="mt-8 max-w-lede text-lede px-5 text-center md:text-left md:px-0 text-toned sm:text-lede-sm">
            {{ page.hero.description }}
          </p>

          <div class="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
            <UButton size="xl" :to="heroLink" :label="page.cta" />
            <NuxtLink
              :to="page.hero.secondary.to"
              class="text-base font-semibold text-highlighted underline decoration-slate-900/30 decoration-2 underline-offset-6 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {{ page.hero.secondary.label }}
            </NuxtLink>
          </div>

          <p class="mt-8 text-sm text-toned text-center md:text-left">
            {{ page.hero.builder.text }}
            <ULink
              :to="page.hero.builder.to"
              class="font-medium text-highlighted underline decoration-slate-900/25 underline-offset-4 hover:decoration-primary"
            >
              {{ page.hero.builder.label }}
            </ULink>
          </p>
        </div>

        <HeroModel :model="heroModel" player="/assets/models/ants-hero.html" class="px-5 md:px-0"/>
      </div>
    </section>

    <UPageSection
      id="how-it-works"
      :title="page.howItWorks.title"
      :description="page.howItWorks.description"
    >
      <NtBlockStack :blocks="howItWorksBlocks" motion="none" class="mx-auto w-full max-w-sm" />
      <p class="mx-auto mt-8 max-w-2xl text-center text-muted">
        {{ page.howItWorks.example }}
        <UButton variant="link" block :to="page.howItWorks.link.to" class="text-primary underline block">
          {{ page.howItWorks.link.label }}
        </UButton>
      </p>
    </UPageSection>

    <UPageSection
      id="showcase"
      :title="page.showcase.title"
      :description="page.showcase.description"
    >
      <UPageGrid>
        <UCard
          v-for="card in showcase"
          :key="card.model.id"
          as="article"
          class="flex h-full flex-col"
          :ui="{ header: 'p-0 sm:px-0', body: 'flex flex-1 flex-col gap-2' }"
        >
          <template #header>
            <img
              :src="card.model.animatedThumbnail ?? card.model.thumbnail"
              :alt="card.alt"
              class="aspect-square w-full bg-neutral-900 object-cover"
              loading="lazy"
            />
          </template>
          <p class="text-xs text-muted">Model at setup</p>
          <h3 class="text-lg font-semibold text-highlighted">{{ card.model.title }}</h3>
          <p class="text-sm text-muted">{{ card.text }}</p>
          <ULink :to="`/models/${card.model.id}`" class="mt-auto pt-2 text-sm text-primary">
            Open {{ card.model.title }}
          </ULink>
        </UCard>
      </UPageGrid>
    </UPageSection>

    <UPageSection
      id="topics"
      :title="page.topics.title"
    >
      <UPageGrid class="lg:grid-cols-4">
        <TopicTile
          v-for="group in topics"
          :key="group.id"
          :group="group"
          :lead="group.models[0]!"
        />
      </UPageGrid>
      <p class="mt-2 text-center">
        <UButton variant="ghost" to="/models-gallery" icon="lucide:arrow-right">
          {{ page.topics.link }}
        </UButton>
      </p>
    </UPageSection>

    <UPageSection
      id="about"
      orientation="horizontal"
      :title="page.origin.title"
      :description="page.origin.body"
      :ui="{
        root: 'overflow-hidden',
        container: 'pb-0 ml-[25ch] sm:pb-0 lg:pb-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]',
        wrapper: 'lg:pb-32',
      }"
    >
      <template #body>
        <ul aria-label="Devices" class="grid grid-cols-2 gap-3 p-0">
          <li v-for="device in page.origin.devices" :key="device.label" class="m-0">
            <UCard class="h-full">
              <UIcon :name="device.icon" class="size-8 text-primary" />
              <p class="mt-3 font-semibold text-highlighted">{{ device.label }}</p>
              <p class="text-sm text-muted">{{ device.sublabel }}</p>
            </UCard>
          </li>
        </ul>
        <ul aria-label="Browsers" class="mt-8 flex mx-auto gap-20 w-fit p-0">
          <li
            v-for="browser in page.origin.browsers"
            :key="browser.label"
            class="flex flex-col items-center gap-3 text-sm text-muted m-0"
          >
            <UIcon :name="browser.icon" class="size-12" />
            {{ browser.label }}
          </li>
        </ul>
      </template>
      <div class="relative -mr-4 h-80 sm:-mr-6 sm:h-112 lg:mr-0 lg:h-auto lg:self-stretch">
        <NtBrowser url="https://netlogoweb.org/nettango-builder" class="absolute top-0 left-0 w-[115%] lg:top-12 lg:left-16 lg:w-[64vw]">
          <div class="aspect-1309/924 bg-white">
            <img
              src="/assets/home/nettango-player.webp"
              alt="NetTango running in a browser: the Slime model view, its block program and the NetLogo code it generates"
              class="block h-full w-full object-cover object-left mt-5"
            >
          </div>
        </NtBrowser>
      </div>
    </UPageSection>

    <UPageSection :ui="{ root: 'bg-wall' }">
      <div class="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
          {{ page.closing.statement }}
        </h2>
        <UButton size="xl" :to="heroLink" :label="page.cta" />
      </div>
    </UPageSection>

    <UPageSection
      id="faq"
      :title="page.faq.title"
    >
      <UAccordion :items="faqItems" class="mx-auto max-w-3xl">
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
      :links="page.designers.links"
      :ui="{
        root: 'bg-neutral-900 text-white',
        container: 'lg:items-center',
        title: 'text-white!',
        description: 'text-neutral-300',
      }"
    >
      <div class="rounded-2xl bg-white p-6 shadow-sm">
        <AntSetup />
        <p class="mt-4 text-center text-xs text-muted">
          {{ page.designers.caption }}
        </p>
      </div>
    </UPageSection>

  </UPage>
</template>

<script setup lang="ts">
import type { NtBlockSpec } from "~/utils/blockStack";
import type { GalleryModel } from "~/composables/useModels";

const HERO_MODEL_ID = "ants";

const models = useModels();
const byId = (id: string): GalleryModel => models.find((model) => model.id === id)!;

const heroModel = byId(HERO_MODEL_ID);
const heroLink = `/models/${HERO_MODEL_ID}`;
const HERO_BLOCK_WORD = "build";

const curatedIds = new Set(useModelCuration().groups.map((group) => group.id));
const topics = useModelGroups().filter((group) => curatedIds.has(group.id));


const page = {
  cta: "Try a model with your class",
  hero: {
    titleLines: [["Let", "your"], ["students"], ["build", "the"], ["science."]],
    description:
      "NetTango turns NetLogo models into blocks your students snap together. They set the rules, press GO, and watch the results unfold. No coding experience needed.",
    secondary: { label: "Or find the topic you teach", to: "#topics" },
    builder: {
      text: "Designing lessons for a new topic?",
      label: "Read the Builder tutorial",
      to: "/tutorials/introduction-to-the-nettango-builder",
    },
  },
  howItWorks: {
    title: "Build real world phenomenon from simple blocks",
    description:
      "Each model provides blocks for a single phenomenon, such as ant foraging, gas particles, or predators and prey. Students work only with the blocks that phenomenon requires, without first learning a programming language.",
    steps: ["Predict", "Build a rule", "Run", "Compare with the real world", "Revise"],
    example:
      "In Wolves and Sheep, the model begins with three sheep and one wolf. Students add the rules for reproduction and death, then observe which population declines first.",
    link: { label: "Open Wolves and Sheep", to: "/models/wolves-and-sheep" },
  },
  showcase: {
    title: "Give students the tools to explore complexity",
    description:
      "Blocks define rules that ants, trees, and particles follow, then you press GO to see the results in real time",
    cards: [
      {
        id: "antomology-pheromones",
        alt: "The Antomology Pheromones model at setup: ants and a nest with no trail yet",
        text: "Explore how ants use pheromones to find their way. Your students build the rule for laying a chemical trail and observe whether the ants mark a path back to the nest.",
      },
      {
        id: "fire",
        alt: "The Fire model at setup: a forest of trees with nothing burning",
        text: "Explore how fire spreads in a forest simulation. Your students build the fire rule and observe whether the fire spreads as expected.",
      },
      {
        id: "two-particle-sandbox",
        alt: "The Two Particle Sandbox model at setup: two particles in a small box",
        text: "Explore how gas particles interact in a closed box. Your students build the collision rule and observe how collisions change the motion of the particles.",
      },
    ],
  },
  topics: {
    title: "Find the topic you teach",
    link: "Explore the models gallery",
  },
  ready: {
    title: "Lessons to explore",
    paragraphs: [
      "Three gas models correspond to a published lesson, Ideal Gas Laws (lesson 1) from Connected Chemistry (2019): Two Particle Sandbox, Ideal Gas Law, and Gas Particle Sandbox. Other models are available without a lesson.",
      "Some topics are arranged as a sequence of models. The six Antomology models progress from 2 blocks to 13.",
    ],
    models: [
      { label: "Two Particle Sandbox", to: "/models/two-particle-sandbox" },
      { label: "Ideal Gas Law", to: "/models/ideal-gas-law" },
      { label: "Gas Particle Sandbox", to: "/models/gpc" },
      { label: "Antomology Introduction", to: "/models/antomology-introduction" },
    ],
    lesson: {
      label: "See the Ideal Gas Laws lesson",
      to: "https://ct-stem.northwestern.edu/curriculum/preview/513/",
    },
  },
  origin: {
    title: "Runs on all major platforms",
    body: "NetTango is developed at Northwestern's Center for Connected Learning. It is open source, built on NetLogo Web, and runs in the browser.",
    devices: [
      { label: "Chromebook", sublabel: "School managed devices", icon: "i-lucide-laptop-minimal" },
      { label: "Laptop", sublabel: "Windows, macOS and Linux", icon: "i-lucide-laptop" },
      { label: "Desktop", sublabel: "Computer labs and classrooms", icon: "i-lucide-monitor" },
      { label: "Tablet", sublabel: "iPad and Android tablets", icon: "i-lucide-tablet" },
    ],
    browsers: [
      { label: "Chrome", icon: "i-logos-chrome" },
      { label: "Firefox", icon: "i-logos-firefox" },
      { label: "Safari", icon: "i-logos-safari" },
      { label: "Edge", icon: "i-logos-microsoft-edge" },
    ],
  },
  closing: {
    statement:
      "Start with the Ants model.",
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        label: "Do I need to install anything?",
        answer: "No. NetTango runs in your web browser. You do not need to install any software.",
      },
      {
        label: "Do my students need to know how to code?",
        answer:
          "No. Students assemble blocks, and each model includes only the blocks its phenomenon requires. They do not need prior coding experience.",
      },
      {
        label: "What does it cost?",
        answer:
          "Nothing. NetTango is free and open source, developed at Northwestern's Center for Connected Learning by the NetLogo Foundation.",
      },
      {
        label: "Is there a lesson for my topic?",
        answer:
          "We are working on developing an enriched set of lessons for various topics. Right now, you can explore the Ideal Gas Laws lesson on CT-STEM.",
        action: {
          label: "Explore the Ideal Gas Laws lesson",
          to: "https://ct-stem.northwestern.edu/curriculum/preview/513/",
        },
      },
      {
        label: "Which devices does it work on?",
        answer: "NetTango runs in a web browser. It works on Chromebooks, laptops, desktops, and tablets. Make sure your browser is up to date for the best experience.",
      },
      {
        label: "How long does it take to set up?",
        answer: "Each model loads directly from its page, with no installation.",
        hidden: true,
      },
      {
        label: "Can I make blocks for a topic you don't cover?",
        answer: "Yes. New block sets are designed in NetTango Builder.",
        action: {
          label: "Check out the Builder tutorial!",
          to: "/tutorials/introduction-to-the-nettango-builder",
        },
      },
      {
        label: "Do my students need accounts?",
        answer: "No. Students do not need accounts to use NetTango. They can start building and exploring models immediately.",
      },
      {
        label: "What happens to what my students build?",
        answer: "",
        hidden: true,
      },
    ] as { label: string; answer: string; action?: { label: string; to: string }; hidden?: boolean }[],
  },
  designers: {
    title: "Designing blocks for a new topic",
    description:
      "Curriculum designers and researchers use NetTango Builder to design blocks for a new phenomenon. The tutorial builds the blocks for the Ants model from the NetLogo Models Library, with a short video for each step.",
    links: [
      {
        label: "Read the Builder tutorial",
        to: "/tutorials/introduction-to-the-nettango-builder",
      },
      {
        label: "Open the Builder",
        to: "https://netlogoweb.org/nettango-builder",
        target: "_blank",
        color: "neutral" as const,
        variant: "subtle" as const,
        trailingIcon: "i-lucide-arrow-up-right",
      }
    ],
    caption: "The Setup procedure from the Ants tutorial",
  },
};


const HOW_IT_WORKS_COLORS = ["green", "red", "blue", "yellow", "orange"] as const;
const howItWorksBlocks: NtBlockSpec[] = page.howItWorks.steps.map((label, index) => ({
  color: HOW_IT_WORKS_COLORS[index % HOW_IT_WORKS_COLORS.length]!,
  label,
}));

const showcase = page.showcase.cards.map(({ id, alt, text }) => ({
  model: byId(id),
  alt,
  text,
}));

const faqItems = page.faq.items.filter((item) => !item.hidden);
</script>
