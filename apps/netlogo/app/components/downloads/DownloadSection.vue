<template>
  <div class="container pt-3">
    <h1 class="font-semibold text-start text-4xl">Download NetLogo for {{ devOs }}</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start mt-6">
      <div>
        <DownloadForm :versions="downloadData" :dev-os="devOs" />
      </div>

      <div class="text-start text-lg ps-5 mt-4">
        <p>
          Most computers can run NetLogo (see
          <a
            target="_blank"
            class="underline text-blue-600"
            href="https://docs.netlogo.org/requirements.html"
            >system requirements</a
          >). If you would like to run NetLogo on a Chromebook or in a web browser, use
          <a
            class="underline text-blue-600"
            target="_blank"
            href="http://netlogoweb.org/"
            >NetLogo Web</a
          >.
        </p>
        <p class="mt-3">Multiple versions of NetLogo can be installed on the same computer.</p>
        <p class="mt-3">
          For help using old models with new versions see the
          <a
            target="_blank"
            class="underline text-blue-600"
            href="https://docs.netlogo.org/transition.html"
            >Transition Guide</a
          >.
        </p>

        <component :is="NetlogoIcon" class="mt-8 mb-0 max-w-[50%] block mx-auto" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NetlogoIcon from "@repo/vue-ui/assets/brands/NetlogoIcon.svg";
import type { NetLogoVersion } from "~/utils/api";

defineProps<{
  downloadData: NetLogoVersion[];
  devOs: string;
}>();
</script>
