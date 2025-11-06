<template>
  <main class="lg:mt-5 mb-10 px-2 mx-auto nl-container-width">
    <div class="grid lg:grid-cols-12 pt-5 gap-5">
      <div class="lg:col-span-6 xl:col-span-8 nl-container-free">
        <h1 class="nl-col no-stylized-heading mt-0">
          NetLogo <span v-if="productVersion">{{ productVersion }}</span> Documentation
        </h1>
        <p>
          Welcome to the documentation for NetLogo
          <span v-if="productVersion">{{ productVersion }}</span
          >. Download the latest version <Anchor href="https://www.netlogo.org/download" external>here</Anchor>.
        </p>
        <p>
          Please read the
          <Anchor href="/versions#version-700-beta2-july-2025"> Release Notes </Anchor>
          for information about new features, bug fixes, and other changes in this version. For help running models made
          in old versions, see the
          <Anchor href="/transition#changes-for-netlogo-700"> Transition Guide </Anchor>.
        </p>
        <p>
          If you use or refer to NetLogo in a publication, we ask that you cite it. For the correct citation, see the
          <Anchor href="/copyright"> Copyright and License Information </Anchor>
          page.
        </p>
        <div v-if="productInfo.isBeta" class="highlight highlight-warning">
          <p>
            NetLogo <span v-if="productVersion">{{ productVersion }}</span> is a beta release. It is not recommended for
            production use, but we welcome your feedback on the new features and changes.
          </p>
        </div>
      </div>
      <div class="relative lg:col-span-6 xl:col-span-4 w-full h-full">
        <img
          src="/images/netlogo-banner_2x.webp"
          alt="NetLogo Banner"
          class="object-contain w-full h-auto"
          width="364"
          height="394"
          src-set="/images/netlogo-banner_1x.webp 1x, images/netlogo-banner_2x.webp 2x"
        />
      </div>
    </div>

    <div class="grid grid-cols-12 gap-5">
      <div class="col-span-12 xl:col-span-6">
        <h3>Important Links</h3>
        <ul>
          <li v-for="(link, i) in importantLinks" :key="i" class="list-disc">
            <Anchor :href="link.href" :external="link.external">
              {{ link.text }}
            </Anchor>
          </li>
        </ul>
      </div>
      <div class="col-span-12 xl:col-span-6">
        <h3>Beginner's Guide</h3>
        <ul>
          <li v-for="(link, i) in beginnersLinks" :key="i" class="list-disc">
            <Anchor :href="link.href" :external="link.external">
              {{ link.text }}
            </Anchor>
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import beginnersLinksData from '~/assets/beginners-links.json';
import importantLinksData from '~/assets/important-links.json';

const productInfo = useProductInfo();
const productVersion = ref(productInfo.productVersion);
const importantLinks = ref(importantLinksData);
const beginnersLinks = ref(beginnersLinksData);

const description =
  'The official documentation for the NetLogo modeling environment, including user manuals, tutorials, and reference materials.';
// Set page title and meta
useSeoMeta({
  description,
  keywords:
    'NetLogo,Documentation,User Manual,Tutorials,Reference,Agent-Based Modeling,Simulation,Programming,Modeling Environment',
});

defineOgImageComponent('DocsSeo', {
  title: productInfo.productName,
  description,
  theme: '#f31500',
  siteLogo: '/turtles.png',
  siteName: productInfo.productName,
});
</script>
