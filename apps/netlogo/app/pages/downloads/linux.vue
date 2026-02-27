<template>
  <UContainer>
    <!-- Need to do: download section parts -->
    <DownloadSection v-if="downloadData" :download-data="downloadData" dev-os="Linux" />

    <DownloadMachineHelp
      platform-machine="Linux machine"
      machine-link="https://www.howtogeek.com/198615/how-to-check-if-your-linux-system-is-32-bit-or-64-bit/"
      other-platform1="Windows"
      other-platform2="Mac"
    />

    <DonationSection v-if="donationData" :donation-array="donationData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "NetLogo Download for Linux",
  titleTemplate: "%s",
  meta: [{ name: "description", content: "NetLogo download page" }],
});

const config = useRuntimeConfig();

const { data: pageData } = await useAsyncData("download-linux-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getDownloadPageData();
});

const downloadData = computed(() => pageData.value?.netlogo_versions ?? []);
const donationData = computed(() => pageData.value?.donation_data ?? []);
</script>
