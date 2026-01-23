<template>
  <main>
    <Intro :description="introData?.description" />
  </main>
</template>

<script setup lang="ts">
import { useWebsite } from "~/composables/useWebsite";
import NetLogoAPI, { type Introduction } from "~/utils/api";

const meta = useWebsite();
const config = useRuntimeConfig();

const introData = ref<Introduction | null>(null);

onMounted(async () => {
  try {
    const api = new NetLogoAPI(config.public.backendUrl as string);
    const data = await api.getMainPageData();
    introData.value = data.introduction;
  } catch (error) {
    console.error("Failed to fetch intro data:", error);
  }
});
</script>
