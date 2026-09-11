<template>
  <Footer :sections="3">
    <FooterContainer class="mx-auto w-full max-w-(--ui-container)">
      <FooterBrandSection
        :brand="BrandLogo"
        brand-href="/"
        href-aria-label="NetTango Home"
        :span="4"
      >
        <p class="text-sm text-gray-600 max-w-xs">
          Domain-specific block-based programming for agent-based modeling, powered by NetLogo Web.
        </p>
        <p class="mt-4 text-sm text-gray-600 max-w-xs">
          A collaboration between the
          <a
            href="https://ccl.northwestern.edu/"
            class="font-medium text-gray-900 hover:text-primary"
          >
            Center for Connected Learning
          </a>
          and the
          <a
            href="https://tidal.northwestern.edu/"
            class="font-medium text-gray-900 hover:text-primary"
          >
            TIDAL Lab
          </a>
          at Northwestern University.
        </p>
      </FooterBrandSection>

      <FooterSection v-for="column in columns" :key="column.title" :span="column.span">
        <h5 class="mb-3 text-sm font-semibold text-gray-900">{{ column.title }}</h5>
        <ul class="m-0 list-none space-y-2 p-0">
          <li v-for="link in column.links" :key="link.title" class="m-0 p-0">
            <NuxtLink
              :to="link.href"
              :target="link.external ? '_blank' : undefined"
              :external="link.external"
              class="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary"
            >
              {{ link.title }}
              <UIcon
                v-if="link.external"
                name="i-lucide-arrow-up-right"
                class="size-3 text-gray-400"
              />
            </NuxtLink>
          </li>
        </ul>
      </FooterSection>
    </FooterContainer>

    <div
      class="mx-auto mt-4 flex w-full max-w-(--ui-container) flex-col gap-2 border-t border-gray-200 px-1 py-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>&copy; {{ currentYear }} Center for Connected Learning, Northwestern University.</p>
      <p>
        NetTango Web is open source. Builder lives in
        <a href="https://github.com/NetLogo/Galapagos" class="hover:text-primary">Galapagos</a>, the
        blocks interface in
        <a href="https://github.com/NetLogo/NetTango" class="hover:text-primary">NetTango</a>.
      </p>
    </div>
  </Footer>
</template>

<script setup lang="ts">
import BrandLogo from "@repo/vue-ui/assets/brands/NetTango-Logo.svg";
import type { FooterLink } from "@repo/vue-ui/components/footer/types";

type Column = { title: string; span: number; links: FooterLink[] };

const currentYear = new Date().getFullYear();

const columns: Column[] = [
  {
    title: "NetTango",
    span: 2,
    links: [
      { title: "Home", href: "/" },
      { title: "Model Gallery", href: "/models-gallery" },
      { title: "Tutorial", href: "/tutorials/introduction-to-the-nettango-builder" },
      { title: "Builder", href: "https://www.netlogoweb.org/nettango-builder", external: true },
    ],
  },
  {
    title: "NetLogo",
    span: 3,
    links: [
      { title: "NetLogo Home", href: "https://www.netlogo.org/", external: true },
      { title: "NetLogo Web", href: "https://www.netlogoweb.org/", external: true },
      { title: "User Guide", href: "https://docs.netlogo.org", external: true },
      { title: "Forum", href: "https://forum.netlogo.org", external: true },
    ],
  },
  {
    title: "Source",
    span: 3,
    links: [
      { title: "NetTango on GitHub", href: "https://github.com/NetLogo/NetTango", external: true },
      {
        title: "Documentation Wiki",
        href: "https://github.com/NetLogo/NetTango/wiki",
        external: true,
      },
      {
        title: "Galapagos (NetLogo Web)",
        href: "https://github.com/NetLogo/Galapagos",
        external: true,
      },
      { title: "CCL", href: "https://ccl.northwestern.edu/", external: true },
    ],
  },
];
</script>
