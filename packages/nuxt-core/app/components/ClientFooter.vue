<template>
  <Footer :sections="3">
    <FooterContainer>
      <FooterBrandSection
        :brand="WebsiteLogo"
        brand-href="/"
        :href-aria-label="hrefAriaLabel"
        class="w-fit mx-auto"
      >
      </FooterBrandSection>
      <FooterSection :span="8">
        <p>{{ meta.longDescription }}</p>
      </FooterSection>
    </FooterContainer>
  </Footer>
</template>

<script setup lang="ts">
import { WebsiteLogo } from "~/assets/website-logo";

const meta = useWebsite();
const currentYear = ref(new Date().getFullYear());

const hrefAriaLabel = computed(() => `Navigate to the homepage of ${meta.value.name}`);

onMounted(() => {
  currentYear.value = new Date().getFullYear();
});
</script>
