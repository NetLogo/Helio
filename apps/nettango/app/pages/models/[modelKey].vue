<template>
  <NuxtLayout name="app" class="no-stylized-heading">
    <template #bar>
      <ModelAppBar
        :model="model"
        :sidebar-visible="sidebarVisible"
        :sidebar-icons="sidebarIcons"
        :swapped="swapped"
        @toggle-sidebar="toggleSidebar"
        @swap="swapped = !swapped"
        @reset-split="split?.reset()"
      />
    </template>

    <!-- One split for every model, not one per model: a teacher sets it once. -->
    <NtSplitPane
      v-if="model"
      ref="split"
      storage-key="model-app-view"
      :default-ratio="70"
      label="Resize model and details"
      :initial-ratio="queryRatio"
      :hide-end="sidebarState"
      :reversed="swapped"
    >
      <template #start>
        <div ref="stage" class="size-full overflow-hidden bg-white">
          <iframe
            ref="frame"
            :src="model.player"
            :title="`${model.title} NetTango model`"
            class="block border-0 bg-white"
            :class="scale < 1 ? 'origin-top-left' : 'size-full'"
            :style="
              scale < 1
                ? { width: `${naturalWidth}px`, height: `${frameHeight}px`, transform: `scale(${scale})` }
                : undefined
            "
            allow="fullscreen"
            @load="fitPlayer"
          />
        </div>
      </template>
      <template #end>
        <div class="min-h-full bg-muted p-3">
          <ModelSidebar :model="model" class="lg:w-full" />
        </div>
      </template>
    </NtSplitPane>
    <ErrorDisplay v-else :error-code="404" error-details="The requested model could not be found." />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

definePageMeta({ layout: false });

const route = useRoute();
const modelKey = route.params.modelKey as string;
const model = useModels().find((m) => m.id === modelKey);

const queryRatio = splitFromQuery(route.query.split);
const sidebarState = ref<boolean | "compact">(sidebarHiddenFromQuery(route.query.sidebar) ? true : "compact");
const swapped = ref(false);
const isDesktop = ref(false);
const split = useTemplateRef<{ reset: () => void }>("split");

const sidebarVisible = computed(
  () => sidebarState.value === false || (sidebarState.value === "compact" && isDesktop.value),
);
// One icon per breakpoint, chosen in CSS, so the SSR markup is already right before isDesktop is known.
const sidebarIcons = computed(() => ({
  desktop: `i-lucide-panel-${swapped.value ? "left" : "right"}-${sidebarState.value === true ? "open" : "close"}`,
  compact: `i-lucide-panel-${swapped.value ? "top" : "bottom"}-${sidebarState.value === false ? "close" : "open"}`,
}));

const toggleSidebar = () => {
  sidebarState.value = sidebarVisible.value;
};

const frame = useTemplateRef<HTMLIFrameElement>("frame");
const stage = useTemplateRef<HTMLDivElement>("stage");
const scale = ref(1);
const naturalWidth = ref(0);
const frameHeight = ref(0);
let observer: ResizeObserver | undefined;

const fitPlayer = () => {
  const pane = stage.value;
  const player = frame.value;
  if (!pane || !player) return;
  const doc = player.contentDocument;
  const box = doc?.getElementById("ntb-container") ?? doc?.body;
  if (box) naturalWidth.value = playerWidth(player.clientWidth, box);
  scale.value = fitScale(pane.clientWidth, naturalWidth.value);
  frameHeight.value = fillHeight(pane.clientHeight, scale.value);
};

onMounted(() => {
  const query = window.matchMedia("(min-width: 64rem)");
  isDesktop.value = query.matches;
  useEventListener(query, "change", (event: MediaQueryListEvent) => {
    isDesktop.value = event.matches;
  });

  observer = new ResizeObserver(fitPlayer);
  if (stage.value) observer.observe(stage.value);
  // The player reports its content size every 300ms while embedded; the first report lands after load.
  useEventListener(window, "message", (event: MessageEvent) => {
    if (event.source === frame.value?.contentWindow && event.data?.type === "ntb-resize") fitPlayer();
  });
});

onBeforeUnmount(() => observer?.disconnect());

if (model) {
  const curation = useModelCuration();
  usePageSeo({
    title: model.title,
    description: modelDescription(model, modelMetadata(curation, model.id)),
  });
  defineOgImageComponent("ModelSeo", {
    title: model.title,
    topic: modelNavigation(curation, useModels(), model.id).topic?.title,
    thumbnail: `/assets/og/${model.id}.jpg`,
  });
} else {
  useHead({
    title: "Model Not Found",
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  });
}
</script>
