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
import type { FooterLink } from '@repo/vue-ui/components/footer/types';

const currentYear = ref(new Date().getFullYear());
const meta = useWebsite();

const relatedLinks: FooterLink[] = [
  {
    title: 'NetLogo Home',
    href: 'https://www.netlogo.org/',
    external: true,
  },
  {
    title: 'CCL Home',
    href: 'https://ccl.northwestern.edu/',
    external: true,
  },
  {
    title: 'NetLogo Web',
    href: 'https://www.netlogoweb.org/',
    external: true,
  },
  {
    title: 'NetTango Web',
    href: 'https://ccl.northwestern.edu/nettangoweb/',
    external: true,
  },
  { title: 'NetLogo 3D', href: '/3d', external: false },
  {
    title: 'BehaviorSearch',
    href: 'https://www.behaviorsearch.org/',
    external: true,
  },
  { title: 'Contact Us', href: '/contact', external: false },
];

onMounted(() => {
  currentYear.value = new Date().getFullYear();
});
</script>
