<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator color="var(--ui-primary)" :throttle="100" />
  <NuxtLayout>
    <PageBoundary>
      <UApp>
        <NuxtPage />
      </UApp>
    </PageBoundary>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useWebsite } from "~/composables/shared/useWebsite";

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
    bodyAttrs: {
      "class": "static"
    }
  });
  useSeoMeta({
    ogSiteName: "NetLogo",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterSite: "netlogo",
  });
}

onMounted(() => {
  document.body.classList.remove("static");
});
</script>
