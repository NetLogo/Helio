<template>
  <UContainer>
    <section class="w-full bg-white pt-2">
      <div class="container mx-auto py-12 px-4">
        <div class="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div class="flex-1 flex items-center justify-center lg:justify-end">
            <div class="intro-logo-container flex items-center gap-4">
              <component :is="TurtlesLogo" class="intro-turtles w-24 md:w-32 lg:w-40" />
              <div class="flex flex-col">
                <span class="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800"
                  >NetLogo</span
                >
                <span class="text-lg md:text-xl lg:text-2xl font-medium text-red-500 italic">
                  Simulate, Explore, Understand
                </span>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center lg:items-start gap-4">
            <p class="text-lg font-medium leading-relaxed text-center lg:text-left max-w-lg">
              {{ description }}
            </p>
            <div class="flex flex-row gap-3 items-start">
              <div class="flex flex-col items-center">
                <!-- <button
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm uppercase tracking-wide transition-colors"
                  @click="scrollToGetNetLogo"
                >
                  GET NETLOGO
                </button> -->
                <Button variant="default" size="lg" class="mt-2" @click="scrollToGetNetLogo">
                  GET NETLOGO
                </Button>
                <span class="text-gray-500 text-sm mt-1">100% Free</span>
              </div>
              <div class="flex flex-col items-center">
                <Button variant="outline" size="lg" class="mt-2" @click="navigateToDonate">
                  DONATE
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </UContainer>
</template>

<script setup lang="ts">
import TurtlesLogo from "@repo/vue-ui/assets/brands/Turtles.svg";
import Button from "../../../../packages/vue-ui/src/components/Button.vue";

interface Props {
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description:
    "Powerful yet easy-to-learn environment for agent-based modeling in both research and education.",
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
