<template>
  <div v-if="donationData" class="py-8">
    <div class="flex flex-col lg:flex-row items-start gap-8">
      <!-- Content (Left) -->
      <div class="w-full lg:w-1/2">
        <h1 class="text-3xl lg:text-4xl font-semibold mb-4">{{ donationData.title }}</h1>
        <div class="text-lg leading-relaxed mb-8">
          <MDC :value="donationData.text" />
        </div>
        <div class="flex flex-col items-center">
          <NuxtLink :to="donationData.url" external target="_blank">
            <Button variant="default" class="text-xl px-6 py-6"> Donate </Button>
          </NuxtLink>
          <p class="text-center text-sm text-gray-600 mt-2 max-w-[400px]">
            Donations are processed through Northwestern University, but 100% goes to support
            NetLogo
          </p>
        </div>
      </div>

      <div v-if="donationData.image?.id" class="w-full lg:w-1/2 flex justify-center">
        <img
          :src="`${backendUrl}/assets/${donationData.image.id}`"
          :alt="donationData.title"
          class="w-auto h-auto rounded-lg"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DonationData } from "~/utils/api";
import Button from "../../../../../packages/vue-ui/src/components/Button.vue";

const props = defineProps<{
  donationArray: DonationData[];
}>();

const config = useRuntimeConfig();
const backendUrl = config.public.backendUrl as string;

const randomIndex = Math.floor(Math.random() * props.donationArray.length);
const donationData = ref<DonationData | null>(props.donationArray[randomIndex] ?? null);
</script>
