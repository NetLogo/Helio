<template>
  <UContainer>
    <ContactSection :contact-data="contactData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

useHead({
  title: "NetLogo Contact",
  titleTemplate: "%s",
  meta: [
    { name: "description", content: "Information for how to contact NetLogo" },
  ],
});

const config = useRuntimeConfig();

const { data: contact } = await useAsyncData("contact-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getContact();
});

const contactData = computed(() => contact.value ?? []);
</script>
