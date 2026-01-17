<template>
  <Footer :sections="3">
    <FooterContainer>
      <FooterBrandSection
        :brand="WebsiteLogo"
        brand-href="/"
        :href-aria-label="hrefAriaLabel"
        :span="2"
        class="w-fit"
      >
      </FooterBrandSection>

      <FooterLinksSection
        v-for="section in footerSections"
        :key="section.title"
        :title="section.title"
        :links="section.links"
        :span="calculateSpan(footerSections.length)"
      />

      <FooterSection v-if="footerSections.length === 0" :span="10">
        <p>{{ meta.longDescription }}</p>
      </FooterSection>
    </FooterContainer>
  </Footer>
</template>

<script setup lang="ts">
import { WebsiteLogo } from "~/assets/website-logo";
import { useNavigation } from "~/composables/useNavigation";
import { useWebsite } from "~/composables/useWebsite";

const meta = useWebsite();
const currentYear = ref(new Date().getFullYear());

const hrefAriaLabel = computed(() => `Navigate to the homepage of ${meta.value.name}`);

// Fetch footer navigation from Directus
const { footerSections, fetchNavigation } = useNavigation();

// Calculate span based on number of sections (remaining space after brand section)
const calculateSpan = (sectionCount: number) => {
  if (sectionCount === 0) return 10;
  return Math.floor(10 / sectionCount);
};

onMounted(async () => {
  currentYear.value = new Date().getFullYear();
  await fetchNavigation();
});
</script>

<style scoped>
:deep(.h-8) {
  height: 3rem !important;
}

:deep(.list-disc) {
  list-style-type: none !important;
}

:deep(ul) {
  padding-left: 0 !important;
}

:deep(li) {
  padding-left: 0 !important;
  margin-left: 0 !important;
}
</style>
