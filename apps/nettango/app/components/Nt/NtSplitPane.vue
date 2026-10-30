<template>
  <div
    ref="root"
    class="flex min-h-0 flex-1"
    :class="[reversed ? 'lg:flex-row-reverse' : 'lg:flex-row', compactReversed ? 'flex-col-reverse' : 'flex-col']"
    :style="{ '--split': splitValue }"
  >
    <button
      v-if="collapsible && hideStart === true"
      type="button"
      :aria-label="expandLabel"
      :aria-controls="startId"
      aria-expanded="false"
      class="focus-inset group relative hidden w-3 shrink-0 cursor-pointer items-center justify-center bg-muted hover:bg-accented focus-visible:bg-accented lg:flex"
      @click="emit('expand')"
    >
      <span
        class="h-10 w-1.5 rounded-full bg-accented ring-2 ring-default transition-colors motion-reduce:transition-none group-hover:bg-primary group-focus-visible:bg-primary"
      />
    </button>
    <div
      :id="startId"
      data-split-start
      class="min-h-0 min-w-0 flex-1 overflow-auto"
      :class="[paneClass(hideStart), bothShown && 'lg:flex-none lg:basis-(--split)', dragging && 'pointer-events-none select-none']"
    >
      <slot name="start" />
    </div>
    <div
      v-if="bothShown"
      data-split-handle
      role="separator"
      tabindex="0"
      aria-orientation="vertical"
      :aria-label="label"
      :aria-controls="startId"
      :aria-valuenow="ratio"
      :aria-valuemin="SPLIT_BOUNDS.min"
      :aria-valuemax="SPLIT_BOUNDS.max"
      class="focus-inset group relative hidden w-3 shrink-0 cursor-col-resize touch-none items-stretch justify-center lg:flex"
      @pointerdown="startDrag"
      @pointermove="drag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @keydown="onKey"
      @dblclick="reset"
    >
      <span
        class="w-px transition-colors motion-reduce:transition-none group-hover:bg-primary group-focus-visible:w-0.5 group-focus-visible:bg-primary"
        :class="dragging ? 'w-0.5 bg-primary' : 'bg-accented'"
      />
      <span
        class="absolute top-1/2 h-10 w-1.5 -translate-y-1/2 rounded-full ring-2 ring-default transition-colors motion-reduce:transition-none group-hover:bg-primary group-focus-visible:bg-primary"
        :class="dragging ? 'bg-primary' : 'bg-accented'"
      />
    </div>
    <div
      class="min-h-0 min-w-0 flex-1 overflow-auto"
      :class="dragging && 'pointer-events-none select-none'"
    >
      <slot name="end" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElementSize } from "@vueuse/core";

type PaneHidden = boolean | "compact";

const props = withDefaults(
  defineProps<{
    defaultRatio?: number;
    preferredRatio?: number;
    hideStart?: PaneHidden;
    reversed?: boolean;
    compactReversed?: boolean;
    minStart?: number;
    minEnd?: number;
    label?: string;
    collapsible?: boolean;
    expandLabel?: string;
    // A custom property a head script may set before hydration, read until the component mounts.
    bootRatioProperty?: string;
  }>(),
  {
    defaultRatio: 64,
    preferredRatio: undefined,
    hideStart: false,
    reversed: false,
    compactReversed: false,
    minStart: 320,
    minEnd: 280,
    label: "Resize panes",
    collapsible: false,
    expandLabel: "Show panel",
    bootRatioProperty: undefined,
  },
);

const emit = defineEmits<{ resize: [ratio: number]; collapse: []; expand: [] }>();

const root = useTemplateRef<HTMLElement>("root");
const { width } = useElementSize(root);
const startId = useId();
const dragging = ref(false);
const mounted = ref(false);
const preferred = ref(props.preferredRatio ?? props.defaultRatio);
const ratio = computed(() => clampRatio(preferred.value, width.value, props.minStart, props.minEnd));
const bothShown = computed(() => props.hideStart !== true);
const splitValue = computed(() =>
  mounted.value || !props.bootRatioProperty ? `${ratio.value}%` : `var(${props.bootRatioProperty}, ${ratio.value}%)`,
);

onMounted(() => {
  mounted.value = true;
});

watch(
  () => props.preferredRatio,
  (next) => {
    if (next !== undefined) preferred.value = next;
  },
);

const paneClass = (hidden: PaneHidden) => (hidden === true ? "hidden" : hidden === "compact" ? "max-lg:hidden" : "");

// resize fires once per committed change (drag end, key, reset), not on every pointer move.
const setRatio = (next: number, commit = true) => {
  preferred.value = clampRatio(next, width.value, props.minStart, props.minEnd);
  if (commit) emit("resize", preferred.value);
};

let ratioBeforeDrag = preferred.value;

const startDrag = (event: PointerEvent) => {
  if (event.button !== 0) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  ratioBeforeDrag = preferred.value;
  dragging.value = true;
  event.preventDefault();
};

const drag = (event: PointerEvent) => {
  const rect = root.value?.getBoundingClientRect();
  if (!dragging.value || !rect?.width) return;
  const pointerRatio = getRatioFromPointer(event.clientX, rect.left, rect.width, props.reversed);
  if (props.collapsible && shouldCollapseStart(pointerRatio, rect.width, props.minStart)) {
    dragging.value = false;
    preferred.value = ratioBeforeDrag;
    emit("collapse");
    return;
  }
  setRatio(pointerRatio, false);
};

const endDrag = () => {
  if (!dragging.value) return;
  dragging.value = false;
  emit("resize", preferred.value);
};

const onKey = (event: KeyboardEvent) => {
  const next = getRatioForKey(ratio.value, event.key, props.reversed);
  if (next === undefined) return;
  event.preventDefault();
  setRatio(next);
};

const reset = () => setRatio(props.defaultRatio);

defineExpose({ reset });
</script>
