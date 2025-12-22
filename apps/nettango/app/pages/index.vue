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
              <NuxtLink :to="link.to">
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
          :icon="card.icon"
          :title="card.title"
          spotlight
          spotlight-color="primary"
        >
          <template #description>
            {{ card.description }}
          </template>
        </UPageCard>
      </UPageGrid>
    </UPageSection>

    <UPageSection
      :title="page.gettingStarted.title"
      align="left"
      :ui="{
        root: 'bg-gradient-to-b border-t border-gray-200 from-gray-50 to-white',
        container: 'pt-10!',
      }"
    >
      <template #description>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="page.gettingStarted.description" />
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <!-- Documentation Block -->
        <div class="grid grid-cols-1 col-span-2 gap-8">
          <div v-for="(block, index) in page.gettingStarted.blocks" :key="index" class="space-y-2">
            <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UIcon :name="block.icon" class="text-primary" />
              {{ block.title }}
            </h3>
            <p class="text-gray-500">
              {{ block.description }}
            </p>
            <UButton :to="block.link.to" target="_blank" variant="link" class="p-0">
              {{ block.link.label }} &rarr;
            </UButton>
          </div>
        </div>

        <AntSetup />
      </div>
    </UPageSection>

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
import Turtles from "@repo/vue-ui/assets/brands/Turtles.svg";
const page = {
  hero: {
    title: "Block-based Programming",
    subtitle: "for NetLogo Web",
    description:
      "NetTango is a blocks-based programming environment for NetLogo designed to make it easier than ever to engage in agent-based modeling with little or no programming experience.",
    cta: {
      label: "NetLogo Center",
      to: "https://www.netlogo.org/",
      icon: "i-lucide-arrow-right",
    },
    links: [
      {
        label: "Launch NetTango Builder",
        to: "https://netlogoweb.org/nettango-builder",
        variant: "solid",
      },
      {
        label: "Read the Tutorial",
        to: "https://ccl.northwestern.edu/nettangoweb/tutorial/",
        variant: "outline",
        icon: "i-lucide-book",
      },
    ],
  },
  ecosystem: {
    title: "The NetTango Ecosystem",
    description: "Define the blocks, or play with the model. Two interfaces for different needs.",
    cards: [
      {
        title: "NetTango Desktop",
        description: "Older desktop version of NetTango that works with NetLogo Desktop models.",
        icon: "i-lucide-computer",
      },
      {
        title: "NetTango Builder",
        description:
          "NetTango builder is an interface for defining blocks and linking them to existing NetLogo Web models.",
        icon: "i-heroicons-wrench-screwdriver",
      },
      {
        title: "NetTango Player",
        description:
          "NetTango player provides the model for end-users to experiment with the model’s behavior using domain-specific blocks.",
        icon: "i-heroicons-play-circle",
      },
    ],
  },
  gettingStarted: {
    title: "Getting Started",
    description: `The <a href="https://www.netlogoweb.org/nettango-builder" class="text-primary hover:underline">NetTango builder</a> is available as a part of the NetLogo Web site. <br /><br /> You can select <code class="text-primary font-bold bg-slate-100 rounded-lg px-3 py-1">Files > Load Wolves and Sheep</code> sample project to get a quick look at a simple NetTango Web project.`,
    blocks: [
      {
        title: "Documentation",
        description:
          "We have documentation on our GitHub wiki on the basic concepts, terminology, and usage.",
        icon: "i-heroicons-document-text",
        link: {
          label: "Visit Wiki",
          to: "https://github.com/NetLogo/NetTango/wiki",
        },
      },
      {
        title: "Detailed Tutorial",
        description:
          "There is also a detailed tutorial available which includes links to some completed NetTango Web models as examples.",
        icon: "i-heroicons-academic-cap",
        link: {
          label: "Start Tutorial",
          to: "https://ccl.northwestern.edu/nettangoweb/tutorial/",
        },
      },
      {
        title: "Ants Model",
        description:
          "You can also explore the Ant Model to see how NetTango Web blocks are used in a complete example.",
        icon: "i-lucide-info",
        link: {
          label: "Check out Ants Model",
          to: "https://ccl.northwestern.edu/nettangoweb/tutorial/tango/ants.html",
        },
      },
    ],
  },
  collaboration: {
    title: "Collaboration & Open Source",
    content: `NetTango Web is developed as a collaboration between the <a href="https://ccl.northwestern.edu/" class="underline decoration-dotted hover:text-primary">Center for Connected Learning</a> and the <a href="https://tidal.northwestern.edu/" class="underline decoration-dotted hover:text-primary">TIDAL lab</a>, both at Northwestern University.`,
    footer: `NetTango Web is open source software. The NetTango Web builder is part of the <a href="#" class="text-primary hover:underline">Galapagos project</a> for NetLogo Web. The NetTango blocks interface has its own <a href="https://github.com/NetLogo/NetTango" class="text-primary hover:underline">repository</a>.`,
  },
};
</script>
