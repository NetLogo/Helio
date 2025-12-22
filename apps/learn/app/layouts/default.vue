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
const productInfo = useProductInfo();
const pageProductName = productInfo.productName;

useHead({
  titleTemplate: (chunk) => (chunk ? `${chunk} - ${pageProductName}` : pageProductName),
  link: () => [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
  ],
});

useSeoMeta({
  ogSiteName: pageProductName,
  ogType: 'website',
  twitterCard: 'summary_large_image',
});
</script>
