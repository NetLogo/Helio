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
            {{ page?.hero.cta.label }}
          </UBadge>
        </NuxtLink>
      </template>

      <template #title>
        <span class="text-primary">Block-based Programming</span><br /><span class="text-4xl block"
          >for NetLogo Web</span
        >
      </template>

      <template #description>
        <LazyMDC
          :value="page?.hero.description"
          unwrap="p"
          cache-key="index-hero-description"
          hydrate-never
        />
      </template>

      <template #links>
        <div class="flex flex-col gap-4">
          <div class="flex items-center flex-wrap gap-2">
            <Button size="lg" as-child>
              <NuxtLink to="https://netlogoweb.org/nettango-builder">
                Launch NetTango Builder
              </NuxtLink>
            </Button>
            <Button size="lg" variant="outline" as-child>
              <NuxtLink to="https://ccl.northwestern.edu/nettangoweb/tutorial/">
                <Icon name="i-lucide-book" class="size-5" />
                Read the Tutorial
              </NuxtLink>
            </Button>
          </div>
        </div>
      </template>

      <ClientOnly>
        <UPageCard
          class="overflow-auto lg:absolute [@media(min-width:2400px)]:relative lg:-mt-16 [@media(min-width:2400px)]:mt-8 right-0 [@media(min-width:2400px)]:right-auto w-screen lg:w-[calc(50%-2rem)] [@media(min-width:2400px)]:w-full max-w-[800px] [@media(min-width:2400px)]:mx-auto rounded-none lg:rounded-l-[calc(var(--ui-radius)*4)] [@media(min-width:2400px)]:rounded-2xl -mx-4 sm:-mx-6 lg:mx-0 ring-0 bg-transparent"
          variant="subtle"
          :ui="{ container: 'sm:pt-4.5 lg:pr-0 [@media(min-width:2400px)]:px-6 w-full ' }"
        >
          <BlockHero />
        </UPageCard>
      </ClientOnly>
    </UPageHero>

    <UPageSection
      title="The NetTango Ecosystem"
      description="Define the blocks, or play with the model. Two interfaces for different needs."
      :ui="{ container: '!pt-10' }"
      class="bg-gradient-to-b border-t border-gray-200 from-gray-50 to-white"
    >
      <UPageGrid>
        <UPageCard icon="i-heroicons-wrench-screwdriver" title="NetTango Builder">
          <template #description>
            NetTango builder is an interface for defining blocks and linking them to existing
            NetLogo Web models.
          </template>
        </UPageCard>

        <UPageCard icon="i-heroicons-play-circle" title="NetTango Player">
          <template #description>
            NetTango player provides the model for end-users to experiment with the model’s behavior
            using domain-specific blocks.
          </template>
        </UPageCard>
      </UPageGrid>
    </UPageSection>

    <UPageSection
      title="Getting Started"
      align="left"
      :ui="{
        root: 'bg-gradient-to-b border-t border-gray-200 from-gray-50 to-white',
        container: 'pt-10!',
      }"
    >
      <template #description>
        The
        <NuxtLink to="https://www.netlogoweb.org/nettango-builder">NetTango builder</NuxtLink> is
        available as a part of the NetLogo Web site. <br /><br />
        You can select
        <code class="text-primary font-bold bg-slate-100 rounded-lg px-3 py-1"
          >Files > Load Wolves and Sheep</code
        >
        sample project to get a quick look at a simple NetTango Web project.
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <!-- Documentation Block -->
        <div class="grid grid-cols-1 col-span-2 gap-8">
          <div class="space-y-2">
            <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="text-primary" />
              Documentation
            </h3>
            <p class="text-gray-500">
              We have documentation on our GitHub wiki on the basic concepts, terminology, and
              usage.
            </p>
            <UButton
              to="https://github.com/NetLogo/NetTango/wiki"
              target="_blank"
              variant="link"
              class="p-0"
            >
              Visit Wiki &rarr;
            </UButton>
          </div>

          <!-- Tutorial Block -->
          <div class="space-y-2">
            <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UIcon name="i-heroicons-academic-cap" class="text-primary" />
              Detailed Tutorial
            </h3>

            <p class="text-gray-500">
              There is also a detailed tutorial available which includes links to some completed
              NetTango Web models as examples.
            </p>
            <UButton
              to="https://ccl.northwestern.edu/nettangoweb/tutorial/"
              target="_blank"
              variant="link"
              class="p-0"
            >
              Start Tutorial &rarr;
            </UButton>
          </div>

          <div class="space-y-2">
            <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UIcon name="i-lucide-info" class="text-primary" />
              Ants Model
            </h3>

            <p class="text-gray-500">
              You can also explore the Ant Model to see how NetTango Web blocks are used in a
              complete example.
            </p>
            <UButton
              to="https://ccl.northwestern.edu/nettangoweb/tutorial/tango/ants.html"
              target="_blank"
              variant="link"
              class="p-0"
            >
              Check out Ants Model &rarr;
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
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Collaboration & Open Source</h2>
          <p class="text-gray-600 max-w-3xl">
            NetTango Web is developed as a collaboration between the
            <a
              href="https://ccl.northwestern.edu/"
              class="underline decoration-dotted hover:text-primary"
              >Center for Connected Learning</a
            >
            and the
            <a
              href="https://tidal.northwestern.edu/"
              class="underline decoration-dotted hover:text-primary"
              >TIDAL lab</a
            >, both at Northwestern University.
          </p>
          <p class="text-sm text-gray-500 mt-4">
            NetTango Web is open source software. The NetTango Web builder is part of the
            <a href="#" class="text-primary hover:underline">Galapagos project</a> for NetLogo Web.
            The NetTango blocks interface has its own
            <a href="https://github.com/NetLogo/NetTango" class="text-primary hover:underline"
              >repository</a
            >.
          </p>
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
    description:
      "NetTango is a blocks-based programming environment for NetLogo designed to make it easier than ever to engage in agent-based modeling with little or no programming experience.",
    cta: {
      label: "NetLogo Center",
      to: "https://www.netlogo.org/",
      icon: "i-lucide-arrow-right",
    },
  },
};
</script>
