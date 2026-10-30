<template>
  <NuxtLayout name="app" class="no-stylized-heading">
    <template #bar>
      <ModelAppBar
        :model="model"
        :sidebar-visible="sidebarVisible"
        :sidebar-icons="sidebarIcons"
        :swapped="swapped"
        :student-mode="studentMode"
        @toggle-sidebar="toggleSidebar"
        @swap="swapped = !swapped"
        @reset-split="split?.reset()"
      />
    </template>

    <NtSplitPane
      v-if="model"
      ref="split"
      :default-ratio="DEFAULT_SIDEBAR_SETTINGS.ratio"
      :min-start="280"
      :min-end="320"
      label="Resize details and model"
      :preferred-ratio="sidebarRatio"
      :hide-start="studentMode || sidebarState"
      :reversed="swapped"
      :compact-reversed="!swapped"
      :collapsible="!studentMode"
      expand-label="Show details"
      :boot-ratio-property="SIDEBAR_RATIO_PROPERTY"
      @collapse="setSidebarState(true)"
      @expand="setSidebarState('compact')"
      @resize="sidebarSettings.save({ ratio: $event })"
    >
      <template #start>
        <div v-if="!studentMode" class="min-h-full bg-muted p-3" data-teacher-only>
          <ModelSidebar :model="model" class="lg:w-full" />
        </div>
      </template>
      <template #end>
        <div ref="stage" class="relative size-full overflow-x-auto overflow-y-hidden bg-white">
          <a
            :href="`#${PLAYER_END_ID}`"
            class="sr-only rounded-md bg-default text-sm font-semibold text-highlighted shadow-md focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:px-3 focus:py-2"
            @click.prevent="playerEnd?.focus()"
          >
            Skip past the model
          </a>
          <div class="h-full overflow-hidden" :style="fit.scale < 1 ? { width: `${fit.width * fit.scale}px` } : undefined">
            <iframe
              ref="frame"
              :src="model.player"
              :title="`${model.title} NetTango model`"
              class="block border-0 bg-white"
              :class="fit.scale < 1 ? 'origin-top-left' : 'size-full'"
              :style="
                fit.scale < 1
                  ? { width: `${fit.width}px`, height: `${frameHeight}px`, transform: `scale(${fit.scale})` }
                  : undefined
              "
              allow="fullscreen"
              @load="fitPlayer"
            />
          </div>
        </div>
        <div :id="PLAYER_END_ID" ref="playerEnd" tabindex="-1" class="sr-only">End of the model</div>
      </template>
    </NtSplitPane>
    <ErrorDisplay v-else :error-code="404" error-details="The requested model could not be found." />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import type { PlayerFit, PlayerParts } from "~/utils/playerFit";
import {
  DEFAULT_SIDEBAR_SETTINGS,
  getSidebarBootScript,
  getSidebarStatePatch,
  removeSidebarBootState,
  SIDEBAR_BOOT_CSS,
  SIDEBAR_RATIO_PROPERTY,
} from "~/utils/sidebarSettings";

definePageMeta({ layout: false });

const route = useRoute();
const modelKey = route.params.modelKey as string;
const model = useModels().find((m) => m.id === modelKey);

// Query and saved state are applied after hydration because prerendered HTML is the same for every query.
const sidebarState = ref<boolean | "compact">("compact");
const sidebarRatio = ref(DEFAULT_SIDEBAR_SETTINGS.ratio);
const sidebarSettings = useSidebarSettings(modelKey);
// The student mode boot script covers the gap until hydration.
const studentMode = ref(false);

useHead({
  script: [
    { key: "nt-student-mode", innerHTML: STUDENT_MODE_BOOT_SCRIPT, tagPosition: "head" },
    { key: "nt-sidebar", innerHTML: getSidebarBootScript(modelKey), tagPosition: "head" },
  ],
  style: [
    { key: "nt-student-mode", innerHTML: STUDENT_MODE_CSS },
    { key: "nt-sidebar", innerHTML: SIDEBAR_BOOT_CSS },
  ],
});
const swapped = ref(false);
const isDesktop = ref(false);
const split = useTemplateRef<{ reset: () => void }>("split");

const sidebarVisible = computed(
  () => sidebarState.value === false || (sidebarState.value === "compact" && isDesktop.value),
);
// One icon per breakpoint, chosen in CSS, so the SSR markup is already right before isDesktop is known.
const sidebarIcons = computed(() => ({
  desktop: `i-lucide-panel-${swapped.value ? "right" : "left"}-${sidebarState.value === true ? "open" : "close"}`,
  compact: `i-lucide-panel-${swapped.value ? "top" : "bottom"}-${sidebarState.value === false ? "close" : "open"}`,
}));

const setSidebarState = (state: boolean | "compact") => {
  sidebarState.value = state;
  const patch = getSidebarStatePatch(state, isDesktop.value);
  if (patch) sidebarSettings.save(patch);
};

const toggleSidebar = () => setSidebarState(sidebarVisible.value);

const PLAYER_END_ID = "player-end";
// The player's code editors keep Tab inside the iframe, so keyboard users need a way around it.
const playerEnd = useTemplateRef<HTMLDivElement>("playerEnd");
const frame = useTemplateRef<HTMLIFrameElement>("frame");
const stage = useTemplateRef<HTMLDivElement>("stage");
const fit = ref<PlayerFit>({ width: 0, scale: 1 });
const frameHeight = ref(0);
let parts: PlayerParts | undefined;
let observer: ResizeObserver | undefined;

const fitPlayer = () => {
  const pane = stage.value;
  const doc = frame.value?.contentDocument;
  if (!pane) return;
  if (doc) {
    injectPlayerWrapStyle(doc);
    parts = measurePlayerParts(doc) ?? parts;
  }
  if (parts) fit.value = fitPlayerParts(pane.clientWidth, parts);
  frameHeight.value = fillHeight(pane.clientHeight, fit.value.scale);
};

const applySavedSidebar = () => {
  const saved = sidebarSettings.load();
  if (saved.hidden) sidebarState.value = true;
  sidebarRatio.value = saved.ratio;
};

// Runs after applySavedSidebar so ?sidebar= and ?split= win for this visit without being saved.
const applyQuerySidebar = () => {
  if (isSidebarHiddenQuery(route.query.sidebar)) sidebarState.value = true;
  // ?split= has always meant the model's share; the split itself now measures the sidebar.
  const querySplit = parseSplitQuery(route.query.split);
  if (querySplit !== undefined) sidebarRatio.value = 100 - querySplit;
};

onMounted(() => {
  studentMode.value = isStudentModeQuery(route.query.mode);
  document.documentElement.removeAttribute(STUDENT_MODE_ATTRIBUTE);
  removeSidebarBootState(document.documentElement);
  if (!studentMode.value) applySavedSidebar();
  applyQuerySidebar();

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
    description: getModelDescription(model, getModelMetadata(curation, model.id)),
  });
  defineOgImage("ModelSeo", {
    title: model.title,
    topic: getModelNavigation(curation, useModels(), model.id).topic?.title,
    thumbnail: `/assets/og/${model.id}.jpg`,
  });
} else {
  useHead({
    title: "Model Not Found",
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  });
}
</script>
