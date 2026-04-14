<template>
  <Footer class="px-10! lg:px-[calc((100vw-var(--max-width-ch))/2)]!">
    <FooterContainer>
      <FooterBrandSection
        :brand="WebsiteLogo"
        brand-href="/"
        :href-aria-label="hrefAriaLabel"
        class="w-fit px-0!"
        :span="4"
      >
        <div class="mt-6">
          <p class="text-sm font-semibold">Developed By:</p>
          <span class="text-sm">
            <a href="https://ccl.northwestern.edu/">
              Center for Connected Learning and Computer-Based Modeling ("CCL")</a
            >
            at Northwestern University
          </span>
        </div>

        <div class="mt-6">
          <p class="text-sm font-semibold">Contact:</p>
          <span class="text-sm">
            <a href="mailto:modelingcommons@ccl.northwestern.edu">
              modelingcommons@ccl.northwestern.edu</a
            >
          </span>
        </div>

        <div class="mt-6">
          <p class="text-sm font-semibold">Report Bugs:</p>
          <span class="text-sm">
            <a href="mailto:bugs@ccl.northwestern.edu"> bugs@ccl.northwestern.edu</a>
          </span>
        </div>
      </FooterBrandSection>

      <FooterSection :span="3" class="h-0 py-0!" />
      <FooterSection :span="2" class="px-0!">
        <p class="text-sm font-semibold text-highlighted">Modeling Commons</p>
        <ul class="mt-3 space-y-4 mx-0 px-0">
          <li v-for="link in links" :key="link.href" class="mx-0">
            <a :href="link.href" class="text-sm">
              {{ link.label }}
            </a>
          </li>
        </ul>
      </FooterSection>
      <FooterSection :span="1" class="h-0 py-0!" />

      <FooterSection :span="2" class="px-0!">
        <p class="text-sm font-semibold text-highlighted">Other NetLogo Products</p>
        <ul class="mt-3 space-y-4 mx-0 px-0">
          <li v-for="product in products" :key="product.href" class="mx-0 flex items-center">
            <UIcon :name="product.icon" class="inline-block mr-2" />
            <a :href="product.href" class="text-sm">
              {{ product.label }}
            </a>
          </li>
        </ul>
      </FooterSection>
    </FooterContainer>
    <hr class="bg-neutral-lighter mt-10" />
    <div class="flex flex-col lg:flex-row gap-5 justify-between">
      <span class="text-sm flex items-center gap-1"
        ><UIcon name="i-lucide-copyright" /> {{ currentYear }} NetLogo. All rights reserved.</span
      >

      <div class="flex gap-5">
        <a href="/privacy" class="text-sm">Privacy Policy</a>
        <a href="/terms" class="text-sm">Terms of Service</a>
        <a href="/cookies" class="text-sm">Cookie Policy</a>
      </div>
    </div>
  </Footer>
</template>

<script setup lang="ts">
import { WebsiteLogo } from "~/assets/website-logo";

const meta = useWebsite();
const currentYear = ref(new Date().getFullYear());

const hrefAriaLabel = computed(() => `Navigate to the homepage of ${meta.value.name}`);

const links = [
  { label: "Home", href: "/" },
  { label: "Models", href: "/models" },
  { label: "About", href: "/about" },
  { label: "Donate", href: "/donate" },
];

const products = [
  { label: "NetLogo", href: "https://www.netlogo.org/", icon: "netlogo-netlogo-desktop" },
  { label: "NetLogo Web", href: "https://www.netlogoweb.org/", icon: "netlogo-netlogo-web" },
  { label: "Hubnet Web", href: "https://hubnetweb.org/", icon: "netlogo-hubnet-web" },
  { label: "NetTango", href: "https://nettango.org/", icon: "netlogo-nettango" },
];

onMounted(() => {
  currentYear.value = new Date().getFullYear();
});
</script>

<style scoped lang="scss">
:deep(a) {
  color: var(--color-text);
  font-weight: 400;
  text-decoration: underline;
  &:hover {
    color: var(--color-royal-blue-dark);
  }
}
</style>
