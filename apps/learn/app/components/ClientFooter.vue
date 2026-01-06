<template>
  <Footer :sections="3">
    <FooterContainer>
      <FooterBrandSection
        :brand="NetLogoLearnGuideLogo"
        brand-href="/"
        href-aria-label="NetLogo Learn Guide Home"
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
import NetLogoLearnGuideLogo from '@repo/vue-ui/assets/brands/NetLogoLearnGuide.svg?url&no-inline';

const currentYear = ref(new Date().getFullYear());
const meta = useWebsite();

onMounted(() => {
  currentYear.value = new Date().getFullYear();
});
</script>
