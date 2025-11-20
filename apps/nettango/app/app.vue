<template>
  <NuxtRouteAnnouncer />
  <UApp>
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtErrorBoundary>
        <NuxtPage />
      </NuxtErrorBoundary>
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} | NetTango` : "NetTango Builder and Player"),
  meta: [{ key: "theme-color", name: "theme-color", content: "#0670ed" }],
});

if (import.meta.server) {
  useHead({
    meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
    htmlAttrs: {
      lang: "en",
    },
  });
  useSeoMeta({
    ogSiteName: "NetTango",
    ogType: "website",
    twitterCard: "summary_large_image",
  });
}
</script>
