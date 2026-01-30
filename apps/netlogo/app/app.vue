<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator color="var(--ui-primary)" />
  <NuxtLayout>
    <NuxtErrorBoundary>
      <UPage>
        <NuxtPage />
      </UPage>
    </NuxtErrorBoundary>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useWebsite } from "./composables/useWebsite";

const meta = useWebsite();

useHead({
  titleTemplate: (title) => (title ? `${title} - ${meta.value.name}` : meta.value.fullName),
});

if (import.meta.server) {
  useHead({
    meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
    htmlAttrs: {
      lang: "en",
    },
  });
  useSeoMeta({
    ogSiteName: "NetLogo",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterSite: "netlogo",
  });
}
</script>
