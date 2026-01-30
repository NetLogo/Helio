<template>
  <Intro :description="introData?.description" />
  <Newsfeed :news-data="newsData" />
  <div class="bg-zinc-200">
    <UContainer>
      <GetNetLogo :products="getNetLogoData" />
    </UContainer>
  </div>
  <UContainer>
    <Community :communities="communityData" />
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
const getNetLogoData = computed(() => mainData.value?.get_netlogo ?? []);
const communityData = computed(() => mainData.value?.community ?? []);
const newsData = computed(() => news.value ?? []);
</script>
