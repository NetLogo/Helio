<template>
  <UPage>
    <UPageHero :title="hero.title" :links="hero.links" class="relative">
      <template #title>
        <span v-for="(line, index) in hero.title.split('\n')" :key="index" class="block">
          {{ line }}
        </span>
      </template>
      <template #description>
        <p v-for="(paragraph, index) in hero.description" :key="index" class="mb-4">
          {{ paragraph }}
        </p>
      </template>
    </UPageHero>
  </UPage>
</template>

<script lang="ts" setup>
import type { PageHeroProps } from "#ui/types";
const hero = {
  title: "Help us build a more\nscientifically-literate world",
  description: [
    "Together, we’re building a future where complex models aren’t locked away in labs, but accessible to everyone",
  ],
  links: [
    {
      label: "Make a Donation",
      icon: "lucide:heart",
      to: "https://give.northwestern.edu/campaigns/37603/donations/new?a=9727882&designation_id=N3004411",
      external: true,
      variant: "solid",
    },
  ],
} satisfies Omit<PageHeroProps, "description"> & { description: string[] };

</script>
