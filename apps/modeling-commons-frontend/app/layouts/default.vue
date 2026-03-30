<template>
  <UApp>
    <ClientNavbar />
    <PageBoundary>
      <UMain class="min-h-[80vh]">
          <slot />
      </UMain>
    </PageBoundary>
    <ClientFooter />
  </UApp>
</template>

<script setup lang="ts">
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
