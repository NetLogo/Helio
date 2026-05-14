<template>
  <UCard
    :ui="{
      body: 'relative rounded-xl overflow-hidden aspect-square  shrink-0',
    }"
    variant="subtle"
  >
    <div
      v-if="state === NLWEmbedState.Preview"
      :data-model-url="modelUrl"
      class="w-full h-full flex flex-col my-auto items-center justify-center gap-3 text-dimmed cursor-pointer relative group"
      @click="onRun"
    >
      <NuxtImg
        v-if="previewImageUrl"
        :src="previewImageUrl"
        alt="Model preview image"
        class="w-full h-full object-cover rounded mb-4 absolute inset-0"
        crossorigin="use-credentials"
        :placeholder="[20, 20]"
      />
      <FallbackThumbnail
        v-else
        class="w-full h-full bg-neutral-lightest rounded mb-4 absolute inset-0"
      />

      <div :class="actionButtonClass">
        <Icon name="material-symbols:play-circle-outline" class="size-18 mx-auto" />
        <span class="font-bold text-md">Click to run model</span>
      </div>
    </div>

    <Error
      v-else-if="state === NLWEmbedState.Error"
      class="p-6 aspect-square"
      title="Failed to load model"
    >
      <UButton variant="outline" color="error" @click="state = NLWEmbedState.Running">
        Try Again
      </UButton>
    </Error>

    <iframe
      v-else-if="state === NLWEmbedState.Running"
      :src="nlwUrl"
      class="w-full h-full border-0 rounded overflow-auto bg-white"
      @load="state = NLWEmbedState.Running"
      @error="state = NLWEmbedState.Error"
    />
  </UCard>
</template>

<script lang="ts" setup>
const props = defineProps<{
  modelUrl: string;
  previewImageUrl?: string | null;
  modelTitle?: string;
}>();

const emit = defineEmits<{ run: [] }>();
const state = ref<NLWEmbedState>(NLWEmbedState.Preview);
const nlwUrl = computed(() => getNetlogoWebEmbedUrl(props.modelUrl, props.modelTitle));

function onRun() {
  state.value = NLWEmbedState.Running;
  emit("run");
}
</script>

<script lang="ts">
export const NLWEmbedState = {
  Preview: "preview",
  Running: "running",
  Error: "error",
};

export type NLWEmbedState = (typeof NLWEmbedState)[keyof typeof NLWEmbedState];

const actionButtonClass = [
  "flex flex-col items-center justify-center gap-4 z-10",
  "w-full h-full text-royal-blue-light",
  "opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-lightest/80",
];
</script>
