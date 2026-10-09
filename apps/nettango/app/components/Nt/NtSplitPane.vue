<template>
  <div
    ref="root"
    class="flex min-h-0 flex-1"
    :class="reversed ? 'flex-col-reverse lg:flex-row-reverse' : 'flex-col lg:flex-row'"
    :style="{ '--split': splitValue }"
  >
    <div
      :id="startId"
      class="min-h-0 min-w-0 flex-1 overflow-auto"
      :class="[paneClass(hideStart), bothShown && 'lg:flex-none lg:basis-(--split)', dragging && 'pointer-events-none select-none']"
    >
      <slot name="start" />
    </div>
    <div
      v-if="bothShown"
      role="separator"
      tabindex="0"
      aria-orientation="vertical"
      :aria-label="label"
      :aria-controls="startId"
      :aria-valuenow="ratio"
      :aria-valuemin="SPLIT_BOUNDS.min"
      :aria-valuemax="SPLIT_BOUNDS.max"
      class="group relative hidden w-3 shrink-0 cursor-col-resize touch-none items-stretch justify-center outline-none lg:flex"
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
      :class="[paneClass(hideEnd), dragging && 'pointer-events-none select-none']"
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
    initialRatio?: number;
    storageKey?: string;
    hideStart?: PaneHidden;
    hideEnd?: PaneHidden;
    reversed?: boolean;
    minStart?: number;
    minEnd?: number;
    label?: string;
  }>(),
  {
    defaultRatio: 64,
    initialRatio: undefined,
    storageKey: undefined,
    hideStart: false,
    hideEnd: false,
    reversed: false,
    minStart: 320,
    minEnd: 280,
    label: "Resize panes",
  },
);

const emit = defineEmits<{ resize: [ratio: number] }>();

const root = useTemplateRef<HTMLElement>("root");
const { width } = useElementSize(root);
const startId = useId();
const dragging = ref(false);
const preferred = ref(props.initialRatio ?? props.defaultRatio);
const ratio = computed(() => clampRatio(preferred.value, width.value, props.minStart, props.minEnd));
const bothShown = computed(() => props.hideStart !== true && props.hideEnd !== true);
const storageId = computed(() => props.storageKey && splitStorageId(props.storageKey));
const hydrated = ref(false);
const splitValue = computed(() => {
  if (hydrated.value || props.initialRatio !== undefined || !props.storageKey) return `${ratio.value}%`;
  return `var(${splitCssVar(props.storageKey)}, ${ratio.value}%)`;
});

if (props.storageKey && props.initialRatio === undefined) {
  useHead({ script: [{ key: `nt-split-${props.storageKey}`, innerHTML: splitBootScript(props.storageKey), tagPosition: "head" }] });
}

const paneClass = (hidden: PaneHidden) => (hidden === true ? "hidden" : hidden === "compact" ? "max-lg:hidden" : "");

const readStored = (): string | null => {
  if (!storageId.value) return null;
  try {
    return localStorage.getItem(storageId.value);
  } catch {
    return null;
  }
};

const writeStored = (value: number | undefined) => {
  if (!storageId.value) return;
  try {
    if (value === undefined) localStorage.removeItem(storageId.value);
    else localStorage.setItem(storageId.value, String(value));
  } catch {
    // Blocked storage only costs persistence; the split still works for this visit.
  }
};

const setRatio = (next: number, persist = true) => {
  preferred.value = clampRatio(next, width.value, props.minStart, props.minEnd);
  if (persist) writeStored(preferred.value);
  emit("resize", preferred.value);
};

const startDrag = (event: PointerEvent) => {
  if (event.button !== 0) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  dragging.value = true;
  event.preventDefault();
};

const drag = (event: PointerEvent) => {
  const rect = root.value?.getBoundingClientRect();
  if (!dragging.value || !rect?.width) return;
  setRatio(ratioFromPointer(event.clientX, rect.left, rect.width, props.reversed), false);
};

const endDrag = () => {
  if (!dragging.value) return;
  dragging.value = false;
  writeStored(preferred.value);
};

const onKey = (event: KeyboardEvent) => {
  const next = ratioForKey(ratio.value, event.key, props.reversed);
  if (next === undefined) return;
  event.preventDefault();
  setRatio(next);
};

const reset = () => {
  setRatio(props.defaultRatio, false);
  writeStored(undefined);
};

onMounted(() => {
  preferred.value = resolveInitialRatio(props.initialRatio, readStored(), props.defaultRatio);
  hydrated.value = true;
});

defineExpose({ reset });
</script>
