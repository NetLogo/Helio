<template>
  <NuxtLink
    :to="href"
    class="w-8 h-8 inline-block hover:brightness-105 hover:scale-[1.05] transition-transform"
    :aria-label="title"
  >
    <span class="sr-only">{{ title }}</span>
    <UAvatar :src="src" :alt="alt" :title="title" class="m-0" />
  </NuxtLink>
</template>

<script setup lang="ts">
type Props = {
  src: string;
  alt: string;
  title: string;
  href: string;
};

defineProps<Props>();
</script>
