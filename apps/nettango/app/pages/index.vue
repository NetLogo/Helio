<template>
  <UPage class="landing no-stylized-heading">
    <!-- direct child h1 no margin what tailwind class is [-->
    <UPageHero
      class="relative [&_h1]:mt-0!"
      orientation="horizontal"
      :ui="{
        container: '!pb-20 py-20 sm:py-32 lg:py-25',
        title: 'text-5xl sm:text-7xl',
        wrapper: 'lg:min-h-[540px]',
      }"
    >
      <template #headline>
        <NuxtLink :to="page.hero.cta.to">
          <UBadge variant="subtle" size="lg" class="px-3 relative rounded-full font-semibold">
            <Turtles class="size-4 pointer-events-none fill-primary" />
            {{ page.hero.cta.label }}
            <Icon :name="page.hero.cta.icon" class="size-4" />
          </UBadge>
        </NuxtLink>
      </template>

      <template #title>
        <span class="text-primary">{{ page.hero.title }}</span
        ><br /><span class="text-4xl block">{{ page.hero.subtitle }}</span>
      </template>

      <template #description>
        <LazyMDC
          :value="page.hero.description"
          unwrap="p"
          cache-key="index-hero-description"
          hydrate-never
        />
      </template>

      <template #links>
        <div class="flex flex-col gap-4">
          <div class="flex items-center flex-wrap gap-2">
            <Button
              v-for="(link, index) in page.hero.links"
              :key="index"
              size="lg"
              :variant="link.variant === 'solid' ? 'default' : 'outline'"
              as-child
            >
              <NuxtLink :to="link.to" :target="link.external ? '_blank' : undefined">
                <Icon v-if="link.icon" :name="link.icon" class="size-5" />
                {{ link.label }}
              </NuxtLink>
            </Button>
          </div>
        </div>
      </template>

      <UPageCard
        class="overflow-auto lg:absolute [@media(min-width:2400px)]:relative lg:-mt-16 [@media(min-width:2400px)]:mt-8 right-0 [@media(min-width:2400px)]:right-auto w-screen lg:w-[calc(50%-2rem)] [@media(min-width:2400px)]:w-full max-w-[800px] [@media(min-width:2400px)]:mx-auto rounded-none lg:rounded-l-[calc(var(--ui-radius)*4)] [@media(min-width:2400px)]:rounded-2xl -mx-4 sm:-mx-6 lg:mx-0 ring-0 bg-transparent"
        variant="subtle"
        :ui="{ container: 'sm:pt-4.5 lg:pr-0 [@media(min-width:2400px)]:px-6 w-full ' }"
      >
        <BlockHero />
      </UPageCard>
    </UPageHero>

    <UPageSection
      :title="page.ecosystem.title"
      :description="page.ecosystem.description"
      :ui="{ container: '!pt-10' }"
      class="bg-gradient-to-primary border-t border-gray-200 from-gray-50 to-white"
    >
      <UPageGrid>
        <UPageCard
          v-for="(card, index) in page.ecosystem.cards"
          :key="index"
          :title="card.title"
          :description="card.description"
          :to="card.to"
          :target="card.external ? '_blank' : undefined"
          :external="card.external"
          spotlight
          spotlight-color="primary"
        >
          <template #leading>
            <div
              class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <UIcon :name="card.icon" class="size-6" />
            </div>
          </template>
          <template #footer>
            <span class="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {{ card.cta }}
              <UIcon :name="card.to ? 'i-lucide-arrow-right' : 'i-lucide-archive'" class="size-4" />
            </span>
          </template>
        </UPageCard>
      </UPageGrid>
    </UPageSection>

    <UPageSection
      :title="page.gallery.title"
      :description="page.gallery.description"
      :links="page.gallery.links"
      :ui="{ container: '!pt-10' }"
      class="border-t border-gray-200"
    >
      <UPageGrid>
        <ModelCard v-for="model in models" :key="model.id" :model="model" />
      </UPageGrid>
    </UPageSection>

    <UPageSection
      :title="page.gettingStarted.title"
      :description="page.gettingStarted.description"
      :features="page.gettingStarted.features"
      :links="page.gettingStarted.links"
      orientation="horizontal"
      :ui="{
        root: 'border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white',
        container: 'pt-10! lg:items-center',
        features: 'gap-6',
      }"
    >
      <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <AntSetup />
        <p class="mb-4 text-xs text-muted text-center uppercase">
          {{ page.gettingStarted.figure.caption }}
        </p>
      </div>
    </UPageSection>

        <UPageCTA
          title="Built something with NetTango?"
          description="Share your blocks environment with the NetLogo community, or open the Builder to start a new one."
          variant="subtle"
          class="mt-16"
          :links="[
            {
              label: 'Open the Builder',
              to: 'https://netlogoweb.org/nettango-builder',
              target: '_blank',
              trailingIcon: 'i-lucide-arrow-up-right',
            },
            {
              label: 'NetLogo Forum',
              to: 'https://forum.netlogo.org',
              target: '_blank',
              color: 'neutral',
              variant: 'subtle',
            },
          ]"
        />

    <UPageSection
      :ui="{ root: 'bg-gray-50  border-t border-gray-200 ', container: '!pt-10 !pb-20' }"
    >
      <div
        class="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left"
      >
        <div class="max-w-3xl">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ page.collaboration.title }}</h2>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <p class="text-gray-600 max-w-3xl" v-html="page.collaboration.content" />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <p class="text-sm text-gray-500 mt-4" v-html="page.collaboration.footer" />
        </div>

        <div class="flex gap-4 opacity-50">
          <UIcon name="i-heroicons-users" class="size-12" />
          <UIcon name="i-heroicons-code-bracket-square" class="size-12" />
          <Turtles class="size-12" />
        </div>
      </div>
    </UPageSection>
  </UPage>
</template>

<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";
import Turtles from "@repo/vue-ui/assets/brands/Turtles.svg";

const models = useModels().slice(0, 3);

const page = {
  hero: {
    title: "Block-based Programming",
    subtitle: "for NetLogo Web",
    description:
      "NetTango is a block-based programming environment for NetLogo Web. Build and explore agent-based models with little or no programming experience.",
    cta: {
      label: "Part of the NetLogo ecosystem",
      to: "https://www.netlogo.org/",
      icon: "i-lucide-arrow-right",
    },
    links: [
      {
        label: "Launch NetTango Builder",
        to: "https://netlogoweb.org/nettango-builder",
        variant: "solid",
        external: true,
      },
      {
        label: "Read the Tutorial",
        to: "/tutorials/introduction-to-the-nettango-builder",
        variant: "outline",
        icon: "i-lucide-book",
      },
    ],
  },
  ecosystem: {
    title: "The NetTango Ecosystem",
    description:
      "Define the blocks in the Builder, then hand the finished model to learners in the Player.",
    cards: [
      {
        title: "NetTango Builder",
        description:
          "Design domain-specific blocks and wire them to an existing NetLogo Web model.",
        icon: "i-heroicons-wrench-screwdriver",
        to: "https://netlogoweb.org/nettango-builder",
        external: true,
        cta: "Open the Builder",
      },
      {
        title: "NetTango Player",
        description:
          "Let learners snap blocks together and run the model. No NetLogo code required.",
        icon: "i-heroicons-play-circle",
        to: "/models/ants",
        cta: "Try the Ants model",
      },
      {
        title: "NetTango Desktop",
        description: "The original desktop version of NetTango, built for NetLogo Desktop models.",
        icon: "i-lucide-computer",
        cta: "Superseded by NetTango Web",
      },
    ],
  },
  gallery: {
    title: "Model Gallery",
    description:
      "Ready-to-run NetTango environments. Try one in your browser, or download the project file to open it in the Builder.",
    links: [
      {
        label: "Browse the gallery",
        to: "/models-gallery",
        trailingIcon: "i-lucide-arrow-right",
        color: "neutral",
        variant: "subtle",
      },
    ] satisfies ButtonProps[],
  },
  gettingStarted: {
    title: "Getting Started",
    description:
      "The NetTango Builder runs in your browser as part of NetLogo Web. Three good places to begin:",
    features: [
      {
        title: "Read the documentation",
        description: "Core concepts, terminology, and usage notes on the GitHub wiki.",
        icon: "i-heroicons-document-text",
        to: "https://github.com/NetLogo/NetTango/wiki",
        target: "_blank",
      },
      {
        title: "Follow the tutorial",
        description:
          "Build the Ants blocks environment from an empty project, one short video per step.",
        icon: "i-heroicons-academic-cap",
        to: "/tutorials/introduction-to-the-nettango-builder",
      },
      {
        title: "Explore a finished example",
        description: "Open the completed tutorial project in the Player before you build your own.",
        icon: "i-lucide-play",
        to: "/models/ants",
      },
    ],
    links: [
      {
        label: "Open the Builder",
        to: "https://www.netlogoweb.org/nettango-builder",
        target: "_blank",
        trailingIcon: "i-lucide-arrow-up-right",
      },
    ],
    figure: {
      caption: "The Setup procedure from the Ants tutorial",
    },
  },
  collaboration: {
    title: "Collaboration & Open Source",
    content: `NetTango Web is developed as a collaboration between the <a href="https://ccl.northwestern.edu/" class="underline decoration-dotted hover:text-primary">Center for Connected Learning</a> and the <a href="https://tidal.northwestern.edu/" class="underline decoration-dotted hover:text-primary">TIDAL lab</a>, both at Northwestern University.`,
    footer: `NetTango Web is open source software. The NetTango Web builder is part of the <a href="https://github.com/NetLogo/Galapagos" target="_blank" class="text-primary hover:underline">Galapagos project</a> for NetLogo Web. The NetTango blocks interface has its own <a href="https://github.com/NetLogo/NetTango" class="text-primary hover:underline">repository</a>.`,
  },
};
</script>
