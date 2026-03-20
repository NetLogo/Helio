<template>
  <div>
    <Intro :description="introData?.description" :intro-splash-data="introSplashData" />
    <Newsfeed :news-data="newsData" />
    <div class="bg-zinc-200">
      <UContainer>
        <GetNetLogo :products="getNetLogoData" />
      </UContainer>
    </div>
    <UContainer>
      <Community :communities="communityData" />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { useWebsite } from "~/composables/useWebsite";
import NetLogoAPI from "~/utils/api";

const _meta = useWebsite();
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
const introSplashData = computed(() => mainData.value?.intro_splash ?? []);
const getNetLogoData = computed(() => mainData.value?.get_netlogo ?? []);
const communityData = computed(() => mainData.value?.community ?? []);
const newsData = computed(() => news.value ?? []);
</script>
