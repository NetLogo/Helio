<template>
  <UContainer>
    <!-- Need to do: download section parts -->
    <DownloadSection v-if="downloadData" :download-data="downloadData" dev-os="Mac" />

    <DownloadMachineHelp
      platform-machine="Mac machine"
      machine-link="https://macreports.com/how-to-know-if-your-mac-has-apple-silicon-or-intel-chip/"
      other-platform1="Windows"
      other-platform2="Linux"
    />

    <DonationSection v-if="donationData" :donation-array="donationData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "NetLogo Download for Mac",
  titleTemplate: "%s",
  meta: [{ name: "description", content: "NetLogo download page" }],
});

const config = useRuntimeConfig();

const { data: pageData } = await useAsyncData("download-mac-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getDownloadPageData();
});

const downloadData = computed(() => pageData.value?.netlogo_versions ?? []);
const donationData = computed(() => pageData.value?.donation_data ?? []);
</script>
