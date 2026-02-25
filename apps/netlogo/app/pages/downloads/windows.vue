<template>
  <UContainer>
    <!-- Need to do: download section parts -->
    <DownloadSection v-if="downloadData" :download-data="downloadData" dev-os="Windows" />

    <MachineHelp
      platform-machine="Windows machine"
      machine-link="https://support.microsoft.com/en-us/topic/determine-whether-your-computer-is-running-a-32-bit-version-or-64-bit-version-of-the-windows-operating-system-1b03ca69-ac5e-4b04-827b-c0c47145944b"
      other-platform1="Mac"
      other-platform2="Linux"
    />

    <DonationSection v-if="donationData" :donation-array="donationData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "NetLogo Download for Windows",
  titleTemplate: "%s",
  meta: [{ name: "description", content: "NetLogo download page" }],
});

const config = useRuntimeConfig();

const { data: pageData } = await useAsyncData("download-windows-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getDownloadPageData();
});

const downloadData = computed(() => pageData.value?.netlogo_versions ?? []);
const donationData = computed(() => pageData.value?.donation_data ?? []);
</script>
