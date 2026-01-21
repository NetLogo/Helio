<template>
  <Footer :sections="3">
    <FooterContainer>
      <FooterBrandSection
        :brand="NetLogoUserManualLogo"
        brand-href="https://www.netlogo.org/"
        href-aria-label="NetLogo Home"
      >
        <hr class="w-full border-gray-300 my-4" />
        <p>
          NetLogo is a programmable modeling environment for simulating natural and social phenomena. It was authored by
          Uri Wilensky in 1999 and has been in continuous development ever since at the Center for Connected Learning
          and Computer-Based Modeling.
        </p>
      </FooterBrandSection>

      <FooterLinksSection :span="3" title="Related Links" :links="relatedLinks" />

      <FooterSection :span="5">
        <p id="copyright" class="mt-2">
          Copyright © 1999-{{ currentYear }} Uri Wilensky and the
          <Anchor href="https://ccl.northwestern.edu/" :external="true">
            Center for Connected Learning and Computer-Based Modeling
          </Anchor>
          at
          <Anchor href="https://www.northwestern.edu/" :external="true"> Northwestern University </Anchor>
          . All rights reserved.
        </p>
        <p>
          This program is free software; you can redistribute it and/or modify it under the terms of the GNU General
          Public License as published by the Free Software Foundation; either version 2 of the
          <Anchor href="/copyright"> License </Anchor>, or (at your option) any later version.
        </p>
        <p>
          Commercial licenses are also available. To inquire about commercial licenses, please contact Uri Wilensky at
          <Anchor href="mailto:netlogo@northwestern.edu"> netlogo@northwestern.edu </Anchor>
          .
        </p>
        <p>
          For more information, visit the
          <Anchor href="https://www.netlogo.org/" :external="true"> NetLogo website </Anchor>
          .
        </p>
      </FooterSection>
    </FooterContainer>
  </Footer>
</template>

<script setup lang="ts">
import NetLogoUserManualLogo from '@repo/vue-ui/assets/brands/NetLogoUserManual.svg';
import type { FooterLink } from '@repo/vue-ui/components/footer/types';
import { onMounted, ref } from 'vue';

const currentYear = ref(new Date().getFullYear());

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
