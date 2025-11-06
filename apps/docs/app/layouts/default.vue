<template>
  <UApp>
    <Search />
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
const pageProductName = `NetLogo ${productInfo.productVersion} User Manual`;

const route = useRoute();
const canonical = computed(() => {
  const routeWithoutVersion = route.fullPath.replace(`/${productInfo.productVersion}`, '');
  const routeWithVersion = ['/', productInfo.productVersion, routeWithoutVersion].join('');
  return new URL(routeWithVersion, productInfo.productWebsite).toString();
});

useHead({
  titleTemplate: (chunk) => (chunk ? `${chunk} - ${pageProductName}` : pageProductName),
  link: () => [
    { rel: 'canonical', href: canonical.value },
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
