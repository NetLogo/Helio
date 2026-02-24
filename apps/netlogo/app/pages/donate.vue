<template>
  <UContainer>
    <DonationSection v-if="donationData" :donation-array="donationData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "NetLogo Donations",
  titleTemplate: "%s",
  meta: [
    { name: "description", content: "NetLogo donation page" },
  ],
});

const config = useRuntimeConfig();

const { data: donationData } = await useAsyncData("donation-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getDonationData();
});
</script>
