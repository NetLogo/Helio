<template>
  <UApp>
    <ClientNavbar />
    <PageBoundary>
      <slot />
    </PageBoundary>
    <ClientFooter />
  </UApp>
</template>

<script setup lang="ts">
import { useWebsite } from "~/composables/useWebsite";

const meta = useWebsite();
const pageProductName = meta.value.name;

useHead({
  titleTemplate: (chunk) => (chunk ? `${chunk} - ${pageProductName}` : pageProductName),
  link: () => [
    {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    },
  ],
});

useSeoMeta({
  ogSiteName: pageProductName,
  ogType: "website",
  twitterCard: "summary_large_image",
});
</script>
