<template>
  <UPage>
    <UPageHero
      :title="hero.title"
      :ui="{
        root: 'bg-royal-blue-darkest text-neutral-lightest',
      }"
    >
      <template #description>
        <p
          v-for="(paragraph, index) in hero.description"
          :key="index"
          class="mb-4 text-neutral-lightest"
        >
          {{ paragraph }}
        </p>
      </template>
    </UPageHero>
  </UPage>
</template>

<script lang="ts" setup>
const hero = {
  title: "Understanding Complexity, Together.",
  description: [
    "We believe that everyone should be able to build and use models, without barriers.",
    "Modeling Commons is a space where people can share their ideas, learn from one another, and collaborate to push the boundaries of what’s possible—together.",
    "In this page you’ll find recommendations as to how to use it, depending on who you might be.",
  ],
};
</script>
