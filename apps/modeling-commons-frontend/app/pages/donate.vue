<template>
  <UPage>
    <UPageHero :title="hero.title">
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
const hero = {
  title: "Support A More \nModel-Literate World",
  description: [
    "Together, we’re building a future where complex models aren’t locked away in labs, but accessible to everyone",
  ],
};
</script>
