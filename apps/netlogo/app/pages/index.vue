<template>
  <UContainer>
    <Intro :description="introData?.description" />
    <Newsfeed :news-data="newsData" />
  </UContainer>
</template>

<script setup lang="ts">
import { useWebsite } from "~/composables/useWebsite";
import NetLogoAPI, { type Introduction, type NewsEntry } from "~/utils/api";

const meta = useWebsite();
const config = useRuntimeConfig();

const introData = ref<Introduction | null>(null);
const newsData = ref<NewsEntry[]>([]);

onMounted(async () => {
  try {
    const api = new NetLogoAPI(config.public.backendUrl as string);

    // Fetch intro and news data in parallel
    const [mainData, news] = await Promise.all([api.getMainPageData(), api.getNews()]);

    introData.value = mainData.introduction;
    newsData.value = news;
  } catch (error) {
    console.error("Failed to fetch page data:", error);
  }
});
</script>
