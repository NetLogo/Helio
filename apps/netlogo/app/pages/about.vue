<template>
  <UContainer>
    <AboutSection v-if="aboutData" :about-data="aboutData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "About NetLogo",
  titleTemplate: "%s",
  meta: [
    { name: "description", content: "NetLogo About Page" },
  ],
});

const config = useRuntimeConfig();

const { data: aboutData } = await useAsyncData("about-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getAboutContent();
});
</script>
