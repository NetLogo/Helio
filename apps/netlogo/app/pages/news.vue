<template>
  <UContainer>
    <NewsSection :news-data="newsData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "NetLogo News",
  titleTemplate: "%s",
  meta: [{ name: "description", content: "Official news of NetLogo" }],
});

const config = useRuntimeConfig();

const { data: news } = await useAsyncData("news-page-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getNews();
});

const newsData = computed(() => news.value ?? []);
</script>
