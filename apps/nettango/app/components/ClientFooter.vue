<template>
  <Footer :sections="3">
    <FooterContainer>
      <FooterBrandSection
        :brand="BrandLogo"
        brand-href="https://www.netlogo.org/"
        href-aria-label="NetLogo Home"
      >
        <hr class="w-full border-gray-300 my-4" />
        <p>
          Domain-centric block-based programming, powered by NetLogo Web for agent-based modeling
          and simulations used by researchers and educators.
        </p>
      </FooterBrandSection>

      <FooterLinksSection :span="3" title="Related Links" :links="relatedLinks" />

      <FooterSection :span="5">
        <p class="text-gray-600 max-w-3xl">
          NetTango Web is developed as a collaboration between the
          <a
            href="https://ccl.northwestern.edu/"
            class="underline decoration-dotted hover:text-primary"
            >Center for Connected Learning</a
          >
          and the
          <a
            href="https://tidal.northwestern.edu/"
            class="underline decoration-dotted hover:text-primary"
            >TIDAL lab</a
          >, both at Northwestern University.
        </p>
        <p class="text-sm text-gray-500 mt-4">
          NetTango Web is open source software. The NetTango Web builder is part of the
          <a href="#" class="text-primary hover:underline">Galapagos project</a> for NetLogo Web.
          The NetTango blocks interface has its own
          <a href="https://github.com/NetLogo/NetTango" class="text-primary hover:underline"
            >repository</a
          >.
        </p>
      </FooterSection>
    </FooterContainer>
  </Footer>
</template>

<script setup lang="ts">
import BrandLogo from "@repo/vue-ui/assets/brands/NetTango-Logo.svg";
import type { FooterLink } from "@repo/vue-ui/components/footer/types";
import { onMounted, ref } from "vue";

const currentYear = ref(new Date().getFullYear());

const relatedLinks: FooterLink[] = [
  {
    title: "NetLogo Home",
    href: "https://www.netlogo.org/",
    external: true,
  },
  {
    title: "CCL Home",
    href: "https://ccl.northwestern.edu/",
    external: true,
  },
  {
    title: "NetLogo Web",
    href: "https://www.netlogoweb.org/",
    external: true,
  },
  {
    title: "NetTango Web",
    href: "https://ccl.northwestern.edu/nettangoweb/",
    external: true,
  },
];

onMounted(() => {
  currentYear.value = new Date().getFullYear();
});
</script>
