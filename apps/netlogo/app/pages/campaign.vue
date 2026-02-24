<template>
  <UContainer>
    <AboutSection v-if="campaignData" :about-data="campaignData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "NetLogo Center Campaign",
  titleTemplate: "%s",
  meta: [{ name: "description", content: "About The NetLogo Center Campaign" }],
});

const config = useRuntimeConfig();

const { data: campaignData } = await useAsyncData("campaign-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getCampaignContent();
});
</script>

<style scoped>
:deep(h1) {
  text-align: center;
}
</style>
