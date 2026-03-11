<template>
  <UApp>
    <ClientNavbar />
    <Announcer />
    <PageBoundary>
      <slot />
    </PageBoundary>
    <ClientFooter />
  </UApp>
</template>

<script setup lang="ts">
const {
  public: {
    website: { productName },
  },
} = useRuntimeConfig();

useHead({
  titleTemplate: (chunk) => (chunk ? `${chunk} - ${productName}` : productName),
  link: () => [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
  ],
});

useSeoMeta({
  ogSiteName: productName,
  ogType: 'website',
  twitterCard: 'summary_large_image',
});
</script>
