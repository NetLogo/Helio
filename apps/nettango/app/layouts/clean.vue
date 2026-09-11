<template>
  <main>
    <ClientNavbar />
    <PageBoundary>
      <UMain class="relative">
        <slot />
      </UMain>
    </PageBoundary>
    <ClientFooter />
  </main>
</template>

<script setup lang="ts">
const pageProductName = `NetTango Builder by NetLogo`;

const appear = ref(false);
const appeared = ref(false);
onMounted(() => {
  setTimeout(() => {
    appear.value = true;
    setTimeout(() => {
      appeared.value = true;
    }, 1000);
  }, 0);
});

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

<style>
body {
  font-family: "Inter", sans-serif;
}
</style>
