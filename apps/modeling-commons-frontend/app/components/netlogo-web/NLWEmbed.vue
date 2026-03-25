<template>
  <UCard
    :ui="{
      body: 'relative rounded-xl overflow-hidden border border-default bg-elevated h-125',
    }"
  >
    <div
      v-if="state === NLWEmbedState.Preview"
      :data-model-url="modelUrl"
      class="w-full h-full flex flex-col my-auto items-center justify-center gap-3 text-dimmed cursor-pointer"
    >
      <NuxtImg
        v-if="previewImageUrl"
        :src="previewImageUrl"
        alt="Model preview image"
        class="w-full h-125 object-cover rounded mb-4"
      />
      <Icon name="i-lucide-circle-play" class="size-18 text-dimmed mx-auto" />
      Click to Run Model
    </div>
    <div v-else-if="state === NLWEmbedState.Error" class="space-y-6 text-center">
      <Icon name="i-lucide-x-circle" class="size-12 text-error-400 mx-auto mb-3" />
      Failed to load model
    </div>
    <div v-else-if="state === NLWEmbedState.Running">
      <iframe
        :src="nlwUrl"
        class="w-full h-125 border-0 rounded overflow-auto"
        @load="state = NLWEmbedState.Running"
        @error="state = NLWEmbedState.Error"
      />
    </div>
  </UCard>
</template>

<script lang="ts" setup>
const props = defineProps<{
  modelUrl: string;
  previewImageUrl?: string;
}>();

const state = ref<NLWEmbedState>(NLWEmbedState.Preview);
const nlwUrl = computed(() => {
  const url = new URL("https://modelingcommons.netlogoweb.org/web");
  url.searchParams.set("url", props.modelUrl);
  return url.toString();
});
</script>

<script lang="ts">
export const NLWEmbedState = {
  Preview: "preview",
  Running: "running",
  Error: "error",
};

export type NLWEmbedState = (typeof NLWEmbedState)[keyof typeof NLWEmbedState];
</script>
