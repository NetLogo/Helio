<template>
  <UContainer>
    <ContactSection :contact-data="contactData" />
  </UContainer>
</template>

<script setup lang="ts">
import NetLogoAPI from "~/utils/api";

const config = useRuntimeConfig();

const { data: contact } = await useAsyncData("contact-data", async () => {
  const api = new NetLogoAPI(config.public.backendUrl as string);
  return await api.getContact();
});

const contactData = computed(() => contact.value ?? []);
</script>
