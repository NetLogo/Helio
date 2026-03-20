<template>
  <UContainer>
    <section class="w-full bg-white pt-2">
      <div class="container mx-auto py-12 px-4">
        <div class="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <div class="flex-1 flex items-center justify-center lg:justify-end">
            <div class="intro-logo-container flex items-center gap-6">
              <component :is="IntroTurtlesSvg" class="intro-turtles w-32 md:w-40 lg:w-52" />
              <div class="flex flex-col gap-2">
                <component :is="LogoTextSvg" class="w-56 md:w-72 lg:w-96 h-auto" />
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center lg:items-start gap-5">
            <p
              class="text-lg md:text-xl font-medium leading-relaxed text-center lg:text-left max-w-lg px-3"
            >
              {{ description }}
            </p>
            <div class="flex flex-row gap-4 items-start">
              <div class="flex flex-col items-center px-3">
                <!-- <button
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm uppercase tracking-wide transition-colors"
                  @click="scrollToGetNetLogo"
                >
                  GET NETLOGO
                </button> -->
                <Button
                  variant="default"
                  size="lg"
                  class="mt-2 text-base px-6 py-3"
                  @click="scrollToGetNetLogo"
                >
                  GET NETLOGO
                </Button>
                <span class="text-gray-500 text-base mt-1">100% Free</span>
              </div>
              <div class="flex flex-col items-center">
                <Button
                  variant="outline"
                  size="lg"
                  class="mt-2 text-base px-6 py-3"
                  @click="navigateToDonate"
                >
                  DONATE
                </Button>
              </div>
            </div>
          </div>
        </div>

        <IntroSplash :page-data="introSplashData" />
      </div>
    </section>
  </UContainer>
</template>

<script setup lang="ts">
import IntroTurtlesSvg from "@repo/vue-ui/assets/brands/intro-turtles.svg";
import LogoTextSvg from "@repo/vue-ui/assets/brands/logo-text.svg";
import type { IntroSplashEntry } from "~/utils/api";
import Button from "../../../../packages/vue-ui/src/components/Button.vue";

interface Props {
  description?: string;
  introSplashData?: IntroSplashEntry[];
}

withDefaults(defineProps<Props>(), {
  description:
    "Powerful yet easy-to-learn environment for agent-based modeling in both research and education.",
  introSplashData: () => [],
});

const scrollToGetNetLogo = () => {
  const route = useRoute();

  if (route.path === "/") {
    const getNetLogoSection = document.querySelector("#get-netlogo");
    if (getNetLogoSection) {
      getNetLogoSection.scrollIntoView({ behavior: "smooth" });
    }
  } else {
    navigateTo("/#get-netlogo");
  }
};

const navigateToDonate = () => {
  navigateTo("/donate");
};
</script>

<style scoped>
.intro-turtles {
  height: auto;
}
</style>
