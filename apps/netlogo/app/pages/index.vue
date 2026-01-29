<template>
  <UContainer>
    <Intro :description="introData?.description" />
    <Newsfeed :news-data="newsData" />
  </UContainer>
</template>

<script setup lang="ts">
import { useWebsite } from "~/composables/useWebsite";
import NetLogoAPI from "~/utils/api";

const meta = useWebsite();
const config = useRuntimeConfig();

const { data: mainData } = await useAsyncData("main-page-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getMainPageData();
});

const { data: news } = await useAsyncData("news-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getNews();
});

const introData = computed(() => mainData.value?.introduction ?? null);
const newsData = computed(() => news.value ?? []);
</script>
