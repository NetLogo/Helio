<template>
  <UContainer>
    <AnnouncementsSection :announcement-data="announcementData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "NetLogo Announcements",
  titleTemplate: "%s",
  meta: [{ name: "description", content: "Announcements related to NetLogo" }],
});

const config = useRuntimeConfig();

const { data: announcements } = await useAsyncData("announcements-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getAnnouncements();
});

const announcementData = computed(() => announcements.value ?? []);
</script>
