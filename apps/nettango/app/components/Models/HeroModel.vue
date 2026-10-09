<template>
  <div
    class="relative mx-auto w-full max-w-hero-model lg:mx-0 lg:max-w-none"
    :class="playing ? '' : 'lg:pl-projector-inset'"
  >
    <NtScreen hung class="lg:ml-auto" :class="playing ? 'lg:w-full' : 'lg:w-projector'">
      <div
        v-if="!playing"
        class="relative aspect-square w-full overflow-hidden rounded-screen ring-1 ring-black/60"
      >
        <img
          :src="model.thumbnail"
          :alt="`The ${model.title} model: ants carry food from colored piles back to the yellow nest, leaving green pheromone trails`"
          width="994"
          height="994"
          fetchpriority="high"
          class="block h-full w-full motion-safe:animate-power-on object-cover [image-rendering:pixelated]"
        />
      </div>
      <div
        v-else
        ref="stage"
        class="overflow-hidden rounded-screen bg-white ring-1 ring-black/20"
        :class="player ? '' : 'max-h-[80vh] overflow-y-auto'"
        :style="player ? { height: `${heroHeight * scale}px` } : undefined"
      >
        <iframe
          ref="frame"
          :src="player ?? model.player"
          :title="`${model.title} NetTango model`"
          class="block border-0 bg-white"
          :class="player ? 'origin-top-left' : 'w-full'"
          :style="
            player
              ? { width: `${HERO_PLAYER.width}px`, height: `${heroHeight}px`, transform: `scale(${scale})` }
              : { height: `${height}px` }
          "
          allow="fullscreen"
          @load="observePlayer"
          @error="playing = false"
        />
      </div>

      <div class="mt-4 flex items-center" :class="playing ? 'justify-start' : 'justify-end'">
        <UButton
          v-if="!playing"
          size="lg"
          icon="i-lucide-play"
          label="Run it here"
          :ui="{ leadingIcon: 'size-4' }"
          @click="playing = true"
        />
        <UButton
          v-else
          variant="link"
          color="neutral"
          icon="i-lucide-arrow-left"
          label="Back to the picture"
          @click="playing = false"
        />
      </div>

      <template v-if="!playing" #overlay>
        <div
          class="relative z-20 mx-auto -mt-10 w-stack max-w-11/12 pt-4.5 pr-9 pb-1.5 pl-4.5 lg:absolute lg:bottom-0.5 lg:-left-stack-offset lg:mt-0 lg:max-w-none"
        >
          <NtBlockStack
            tilt
            :blocks="GO_PROGRAM"
            role="img"
            aria-label="The Ants Go program in blocks: Go. Each ant: if I am not carrying food, turn towards pheromone smell. Wiggle. Move forward."
          />
        </div>
      </template>

      <template #caption>The {{ model.title }} model, with blocks from its Go program.</template>
    </NtScreen>
  </div>
</template>

<script setup lang="ts">
import type { NtBlockSpec } from "~/utils/blockStack";
import type { GalleryModel } from "~/composables/useModels";

const GO_PROGRAM: NtBlockSpec[] = [
  { color: "green", label: "Go" },
  {
    color: "red",
    label: "Each ant",
    children: [
      {
        color: "blue",
        label: "If",
        param: "I am not carrying food",
        children: [{ color: "yellow", label: "Turn towards pheromone smell" }],
      },
      { color: "orange", label: "Wiggle" },
      { color: "purple", label: "Move forward" },
    ],
  },
];

const HERO_PLAYER = { width: 1100, height: 700 };

const props = defineProps<{ model: GalleryModel; player?: string }>();

const playing = ref(false);
const frame = useTemplateRef<HTMLIFrameElement>("frame");
const stage = useTemplateRef<HTMLDivElement>("stage");
const height = ref(props.model.frameHeight ?? 800);
const scale = ref(1);
const heroHeight = ref(HERO_PLAYER.height);
let observer: ResizeObserver | undefined;

const fitStage = () => {
  const width = stage.value?.clientWidth;
  if (width) scale.value = Math.min(1, width / HERO_PLAYER.width);
};

watch(playing, async (isPlaying) => {
  if (isPlaying && props.player) {
    await nextTick();
    fitStage();
  }
});

const observePlayer = () => {
  if (props.player) {
    const page = frame.value?.contentDocument?.documentElement;
    if (page) heroHeight.value = Math.max(HERO_PLAYER.height, page.scrollHeight);
    fitStage();
    observer?.disconnect();
    observer = new ResizeObserver(fitStage);
    if (stage.value) observer.observe(stage.value);
    return;
  }

  const doc = frame.value?.contentDocument;
  const win = frame.value?.contentWindow;
  if (!doc?.documentElement || !win) {
    height.value = 1400;
    return;
  }

  const sync = () => {
    height.value = doc.documentElement.scrollHeight;
  };

  sync();
  observer?.disconnect();
  observer = new ResizeObserver(sync);
  observer.observe(doc.documentElement);
  observer.observe(doc.body);
};

onBeforeUnmount(() => observer?.disconnect());
</script>
