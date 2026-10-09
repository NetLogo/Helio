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
  link: [
    { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
    { rel: "icon", type: "image/png", href: "/favicon-32x32.png", sizes: "32x32" },
    { rel: "icon", type: "image/png", href: "/favicon-16x16.png", sizes: "16x16" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    { rel: "manifest", href: "/manifest.webmanifest" },
  ],
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
