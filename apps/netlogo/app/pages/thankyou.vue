<template>
  <UContainer>
    <ThankYouSection />
    <DonationSection v-if="donationData" :donation-array="donationData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "Thanks for Downloading NetLogo",
  titleTemplate: "%s",
  meta: [{ name: "description", content: "NetLogo Downloading Thank You Page" }],
});

const config = useRuntimeConfig();

const { data: donationData } = await useAsyncData("thankyou-donation-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getDonationData();
});
</script>
