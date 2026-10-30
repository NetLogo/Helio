<template>
  <div class="pg" :class="modeClasses" :style="vars">
    <div class="previews">
      <div class="hero-preview">
        <NtBlockStack motion="none" :blocks="GO_PROGRAM" />
      </div>
      <div class="small-previews">
        <div class="hiw-preview">
          <NtBlockStack motion="none" :blocks="HOW_IT_WORKS" />
        </div>
        <div class="title-preview">
          <NtBlock as="div" color="red" label="Antomology" />
        </div>
      </div>
    </div>

    <aside class="panel">
      <div class="row">
        <div class="row-head">
          <span class="label">Presets</span>
          <button type="button" class="reset-all" :disabled="!changedAny" @click="resetAll">Reset all</button>
        </div>
        <div class="chips">
          <button
            v-for="(preset, i) in PRESETS"
            :key="i"
            type="button"
            @click="applyPreset(i)"
            @pointerenter="previewPreset(i)"
            @pointerleave="endPreview"
            @focus="previewPreset(i)"
            @blur="endPreview"
          >
            Draft {{ i + 1 }}
          </button>
        </div>
        <p class="previewing" :class="{ 'previewing--on': previewLabel }" aria-live="polite">
          {{ previewLabel ? `Previewing ${previewLabel}, nothing applied` : "Hover a preset to preview it" }}
        </p>
      </div>

      <fieldset>
        <legend>Sizes</legend>
        <div v-for="slider in SLIDERS" :key="slider.key" class="slider">
          <label :for="`pg-${slider.key}`">{{ slider.label }}</label>
          <input
            :id="`pg-${slider.key}`"
            v-model.number="s[slider.key]"
            type="range"
            :min="slider.min"
            :max="slider.max"
            :step="slider.step"
          />
          <output>{{ s[slider.key] }}{{ slider.unit }}</output>
          <button
            type="button"
            class="reset"
            :disabled="s[slider.key] === baseline[slider.key]"
            :aria-label="`Reset ${slider.label}`"
            :title="`Reset to ${baseline[slider.key]}${slider.unit}`"
            @click="resetField(slider.key)"
          >
            ↺
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Styles</legend>
        <div v-for="choice in CHOICES" :key="choice.key" class="row">
          <div class="row-head">
            <span class="label">{{ choice.label }}</span>
            <button
              type="button"
              class="reset"
              :disabled="s[choice.key] === baseline[choice.key]"
              :aria-label="`Reset ${choice.label}`"
              :title="`Reset to ${choice.options.find((o) => o.value === baseline[choice.key])?.label}`"
              @click="resetField(choice.key)"
            >
              ↺
            </button>
          </div>
          <div class="chips">
            <label v-for="option in choice.options" :key="option.value" class="chip">
              <input v-model="s[choice.key]" type="radio" :name="choice.key" :value="option.value" />
              {{ option.label }}
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Colours</legend>
        <div class="row">
          <span class="label">Palette</span>
          <div class="chips">
            <button
              v-for="(palette, i) in PALETTES"
              :key="i"
              type="button"
              @click="applyPalette(i)"
              @pointerenter="previewPalette(i)"
              @pointerleave="endPreview"
              @focus="previewPalette(i)"
              @blur="endPreview"
            >
              Palette {{ i + 1 }}
            </button>
          </div>
        </div>
        <p class="hint">Palette 1 is the theme. 2 is the original Draft 4 set, 3 is pastel, 4 is saturated and Scratch like.</p>
        <div v-for="color in COLORS" :key="color" class="color-row">
          <input
            type="color"
            :aria-label="`${color} face`"
            :value="faceIn(s, color)"
            @input="setFace(color, ($event.target as HTMLInputElement).value)"
          />
          <span class="color-name">{{ color }}</span>
          <span class="swatch" :style="{ background: controlColors[color].face, color: controlColors[color].ink }">Label</span>
          <span class="ratio">{{ controlColors[color].ratio.toFixed(2) }}:1</span>
          <button
            type="button"
            class="reset"
            :disabled="faceIn(s, color) === faceIn(baseline, color)"
            :aria-label="`Reset ${color}`"
            :title="`Reset to ${faceIn(baseline, color)}`"
            @click="setFace(color, faceIn(baseline, color))"
          >
            ↺
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Settings</legend>
        <button type="button" @click="copySettings">Copy settings</button>
        <span class="hint">{{ copyStatus }}</span>
        <textarea readonly rows="6" :value="json" @focus="($event.target as HTMLTextAreaElement).select()" />
      </fieldset>
    </aside>
  </div>
</template>

<script setup lang="ts">
import type { NtBlockColor } from "~/components/Nt/NtBlock.vue";
import type { NtBlockSpec } from "~/utils/blockStack";

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

const HOW_IT_WORKS: NtBlockSpec[] = (["Predict", "Build a rule", "Run", "Compare with the real world", "Revise"] as const).map(
  (label, i) => ({ color: (["green", "red", "blue", "yellow", "orange"] as const)[i]!, label }),
);

const COLORS: NtBlockColor[] = ["green", "red", "blue", "yellow", "orange", "purple"];
const THEME: Record<NtBlockColor, string> = {
  green: "#68da2f",
  red: "#ba3b3b",
  blue: "#94b8ff",
  yellow: "#ffcf33",
  orange: "#ffa057",
  purple: "#7c4ddb",
};
const PALETTES: (Record<NtBlockColor, string> | null)[] = [
  null,
  { green: "#2fda68", red: "#ff6647", blue: "#70a0ff", yellow: "#ffcf33", orange: "#ff8533", purple: "#ae6ef7" },
  { green: "#9be3b0", red: "#f2a0a0", blue: "#a9c4f5", yellow: "#f7e08a", orange: "#f8c08f", purple: "#c9b0f0" },
  { green: "#59c059", red: "#ff6680", blue: "#4c97ff", yellow: "#ffbf00", orange: "#ffab19", purple: "#9966ff" },
];

type Settings = {
  groove: number;
  gap: number;
  edge: number;
  corner: number;
  tabWidth: number;
  tabReach: number;
  notchPlay: number;
  headHeight: number;
  footHeight: number;
  armWidth: number;
  outerArmWidth: number;
  outerFootHeight: number;
  fontSize: number;
  fontWeight: number;
  tilt: number;
  shadow: number;
  overhang: "over" | "align" | "narrow";
  arm: "page" | "flush" | "parent";
  mouth: "page" | "parent" | "recess" | "wash";
  lastTab: "hide" | "show";
  edgeStyle: "solid" | "outline" | "none";
  colors: Record<NtBlockColor, string> | null;
};

const DEFAULTS: Settings = {
  groove: 0.32,
  gap: 0.357,
  edge: 0.214,
  corner: 0.5625,
  tabWidth: 1,
  tabReach: 0.214,
  notchPlay: 0.143,
  headHeight: 2.857,
  footHeight: 1.429,
  armWidth: 1.786,
  outerArmWidth: 2.857,
  outerFootHeight: 2.857,
  fontSize: 0.8,
  fontWeight: 800,
  tilt: -1.5,
  shadow: 1,
  overhang: "align",
  arm: "page",
  mouth: "page",
  lastTab: "hide",
  edgeStyle: "solid",
  colors: null,
};

const PRESETS: Partial<Settings>[] = [
  {},
  { groove: 0.143, fontWeight: 700, overhang: "over" },
  { groove: 0, gap: 0.357, arm: "flush" },
  { edge: 0.143, groove: 0.071, gap: 0.214 },
  { edge: 0.1, groove: 0, gap: 0, corner: 0.25, tabReach: 0.2, notchPlay: 0, overhang: "align", arm: "flush" },
  { tilt: 0, shadow: 0.5, overhang: "align", groove: 0, gap: 0.357, arm: "flush" },
];

const SLIDERS: { key: keyof Settings; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "groove", label: "Groove width", min: 0, max: 0.6, step: 0.01, unit: "em" },
  { key: "gap", label: "Gap between blocks", min: 0, max: 0.8, step: 0.01, unit: "em" },
  { key: "edge", label: "Edge depth", min: 0, max: 0.5, step: 0.01, unit: "em" },
  { key: "corner", label: "Corner radius", min: 0, max: 1.2, step: 0.01, unit: "em" },
  { key: "tabWidth", label: "Tab width", min: 0.3, max: 1.4, step: 0.01, unit: "em" },
  { key: "tabReach", label: "Tab reach", min: 0, max: 0.6, step: 0.01, unit: "em" },
  { key: "notchPlay", label: "Notch clearance", min: 0, max: 0.4, step: 0.01, unit: "em" },
  { key: "headHeight", label: "Head height", min: 1.8, max: 4.5, step: 0.05, unit: "em" },
  { key: "outerFootHeight", label: "Outer foot height", min: 0.4, max: 4, step: 0.05, unit: "em" },
  { key: "outerArmWidth", label: "Outer arm width", min: 0.6, max: 4, step: 0.05, unit: "em" },
  { key: "footHeight", label: "Inner foot height", min: 0.4, max: 4, step: 0.05, unit: "em" },
  { key: "armWidth", label: "Inner arm width", min: 0.6, max: 4, step: 0.05, unit: "em" },
  { key: "fontSize", label: "Font size", min: 0.6, max: 1.2, step: 0.01, unit: "rem" },
  { key: "fontWeight", label: "Font weight", min: 400, max: 900, step: 100, unit: "" },
  { key: "tilt", label: "Tilt", min: -6, max: 6, step: 0.1, unit: "deg" },
  { key: "shadow", label: "Drop shadow", min: 0, max: 2.5, step: 0.05, unit: "x" },
];

const CHOICES: { key: keyof Settings; label: string; options: { value: string; label: string }[] }[] = [
  {
    key: "overhang",
    label: "Right edge",
    options: [
      { value: "over", label: "Overhang" },
      { value: "align", label: "Align" },
      { value: "narrow", label: "Narrower" },
    ],
  },
  {
    key: "arm",
    label: "Arm",
    options: [
      { value: "page", label: "Groove, page" },
      { value: "flush", label: "Flush" },
      { value: "parent", label: "Groove, parent colour" },
    ],
  },
  {
    key: "mouth",
    label: "Mouth",
    options: [
      { value: "page", label: "Page" },
      { value: "parent", label: "Parent colour" },
      { value: "recess", label: "Darker recess" },
      { value: "wash", label: "Light wash" },
    ],
  },
  {
    key: "lastTab",
    label: "Tab on last block",
    options: [
      { value: "hide", label: "Hide" },
      { value: "show", label: "Show" },
    ],
  },
  {
    key: "edgeStyle",
    label: "Edge",
    options: [
      { value: "solid", label: "Solid" },
      { value: "outline", label: "Outline" },
      { value: "none", label: "None" },
    ],
  },
];

const route = useRoute();
const router = useRouter();

const fromQuery = (): Partial<Settings> => {
  const raw = route.query.s;
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw) as Partial<Settings>;
  } catch {
    return {};
  }
};

const s = reactive<Settings>({ ...DEFAULTS, ...fromQuery() });
const baseline = reactive<Settings>(structuredClone(DEFAULTS));
const preview = ref<Settings | null>(null);
const previewLabel = ref("");
const view = computed<Settings>(() => preview.value ?? s);

const json = computed(() => JSON.stringify(s));

watch(json, (value) => {
  router.replace({ query: { s: value } });
});

const presetSettings = (i: number): Settings => ({ ...DEFAULTS, colors: s.colors, ...PRESETS[i] });
const paletteSettings = (i: number): Settings => ({ ...s, colors: PALETTES[i] ? { ...PALETTES[i]! } : null });

const commit = (next: Settings) => {
  preview.value = null;
  previewLabel.value = "";
  Object.assign(s, structuredClone(toRaw(next)));
  Object.assign(baseline, structuredClone(toRaw(next)));
};
const applyPreset = (i: number) => commit(presetSettings(i));
const applyPalette = (i: number) => commit(paletteSettings(i));

const previewPreset = (i: number) => {
  preview.value = presetSettings(i);
  previewLabel.value = `Draft ${i + 1}`;
};
const previewPalette = (i: number) => {
  preview.value = paletteSettings(i);
  previewLabel.value = `Palette ${i + 1}`;
};
const endPreview = () => {
  preview.value = null;
  previewLabel.value = "";
};

const faceIn = (settings: Settings, color: NtBlockColor) => (settings.colors ?? THEME)[color];
const setFace = (color: NtBlockColor, hex: string) => {
  const next = { ...(s.colors ?? THEME), [color]: hex };
  s.colors = COLORS.every((c) => next[c] === THEME[c]) && !baseline.colors ? null : next;
};

const resetField = (key: keyof Settings) => {
  (s as Record<string, unknown>)[key] = structuredClone(toRaw(baseline[key]));
};
const resetAll = () => Object.assign(s, structuredClone(toRaw(baseline)));
const changedAny = computed(() => JSON.stringify(s) !== JSON.stringify(baseline));

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const DARK_INK = "#1d2a36";

const colorsFor = (settings: Settings) =>
  Object.fromEntries(
    COLORS.map((color) => {
      const face = faceIn(settings, color);
      const edge = toHex(channels(face).map((c) => c * 0.68));
      const dark = contrast(face, DARK_INK);
      const light = contrast(face, "#ffffff");
      const ink = dark >= light ? DARK_INK : "#ffffff";
      return [color, { face, edge, ink, ratio: Math.max(dark, light) }];
    }),
  ) as Record<NtBlockColor, { face: string; edge: string; ink: string; ratio: number }>;
const controlColors = computed(() => colorsFor(s));
const viewColors = computed(() => colorsFor(view.value));

const vars = computed(() => {
  const v = view.value;
  const out: Record<string, string> = {
    "--pg-groove": `${v.arm === "flush" ? 0 : v.groove}em`,
    "--pg-gap": `${v.gap}em`,
    "--pg-edge": `${v.edge}em`,
    "--pg-corner": `${v.corner}em`,
    "--pg-tab-width": `${v.tabWidth}em`,
    "--pg-tab-reach": `${v.tabReach}em`,
    "--pg-notch-play": `${v.notchPlay}em`,
    "--pg-head": `${v.headHeight}em`,
    "--pg-foot": `${v.footHeight}em`,
    "--pg-arm": `${v.armWidth}em`,
    "--pg-outer-arm": `${v.outerArmWidth}em`,
    "--pg-outer-foot": `${v.outerFootHeight}em`,
    "--pg-font": `${v.fontSize}rem`,
    "--pg-weight": `${v.fontWeight}`,
    "--pg-tilt": `${v.tilt}deg`,
    "--pg-shadow": `${v.shadow}`,
  };
  if (v.colors) {
    for (const color of COLORS) {
      const { face, edge, ink } = viewColors.value[color];
      out[`--color-block-${color}`] = face;
      out[`--color-block-${color}-edge`] = edge;
      out[`--color-block-${color}-ink`] = ink;
    }
  }
  return out;
});

const modeClasses = computed(() => {
  const v = view.value;
  return [`overhang-${v.overhang}`, `arm-${v.arm}`, `mouth-${v.mouth}`, `last-tab-${v.lastTab}`, `edge-${v.edgeStyle}`];
});

const copyStatus = ref("");
const copySettings = async () => {
  try {
    await navigator.clipboard.writeText(json.value);
    copyStatus.value = "Copied";
  } catch {
    copyStatus.value = "Clipboard blocked, copy from the box below";
  }
};

definePageMeta({ layout: "clean" });
</script>

<style scoped>
.pg {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24rem;
  gap: 2rem;
  min-height: 100vh;
  padding: 1.5rem;
  background: var(--color-wall);
}

.previews {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  align-items: center;
  padding-block: 2rem;
}

.hero-preview {
  zoom: 1.6;
}

.small-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 3rem;
  align-items: flex-start;
  justify-content: center;
}

.panel {
  position: sticky;
  top: calc(var(--ui-header-height, 4rem) + 1rem);
  align-self: start;
  max-height: calc(100vh - var(--ui-header-height, 4rem) - 2rem);
  overflow: auto;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: #fff;
  font-size: 0.8rem;
}

fieldset {
  margin: 0 0 1rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
}

legend {
  padding: 0 0.25rem;
  font-weight: 700;
}

.slider {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr) 3.75rem 1.5rem;
  gap: 0.5rem;
  align-items: center;
}

.slider output {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.row {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.label {
  font-weight: 600;
}

.row-head {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
}

.reset {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: #fff;
  color: var(--ui-text-highlighted);
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
}

.reset:disabled,
.reset-all:disabled {
  opacity: 0.3;
  cursor: default;
}

.reset-all {
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
}

.previewing {
  margin: 0.25rem 0 0;
  color: var(--ui-text-toned);
}

.previewing--on {
  color: var(--ui-text-highlighted);
  font-weight: 700;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.chips button,
.chip,
.panel > fieldset > button {
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--color-wall);
  cursor: pointer;
}

.chip input {
  margin: 0 0.2rem 0 0;
}

.hint {
  margin: 0.25rem 0;
  color: var(--ui-text-toned);
}

.color-row {
  display: grid;
  grid-template-columns: 2.5rem 4rem 4.5rem 3.5rem 1.5rem;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.25rem;
}

.swatch {
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  font-weight: 700;
  text-align: center;
}

.ratio {
  font-variant-numeric: tabular-nums;
}

textarea {
  width: 100%;
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
}

.pg :deep(.nt-stack) {
  width: 26.5625em;
  rotate: var(--pg-tilt);
  font-size: var(--pg-font) !important;
  filter: drop-shadow(0 1px 1px rgb(18 24 40 / calc(0.18 * var(--pg-shadow))))
    drop-shadow(0 14px 14px rgb(18 24 40 / calc(0.16 * var(--pg-shadow))))
    drop-shadow(0 34px 38px rgb(18 24 40 / calc(0.18 * var(--pg-shadow)))) !important;
}

.hiw-preview :deep(.nt-stack) {
  width: 18em;
}

.pg :deep(.nt-block.nt-block) {
  --block-groove: var(--pg-groove) !important;
  --block-gap: var(--pg-gap) !important;
  --block-edge-depth: var(--pg-edge) !important;
  --block-corner: var(--pg-corner) !important;
  --tab-width: var(--pg-tab-width) !important;
  --tab-reach: var(--pg-tab-reach) !important;
  --notch-play: var(--pg-notch-play) !important;
}

.pg :deep(.nt-block--md) {
  font-size: var(--pg-font) !important;
}

.title-preview :deep(.nt-block--md) {
  font-size: calc(var(--pg-font) * 1.875) !important;
}

.pg :deep(.nt-block--md > .nt-block__cap > .nt-block__head) {
  min-height: var(--pg-head) !important;
  font-weight: var(--pg-weight) !important;
}

.pg :deep(.nt-block--param > .nt-block__cap > .nt-block__head) {
  min-height: calc(var(--pg-head) + 0.357em) !important;
}

.pg :deep(.nt-block--c > .nt-block__foot) {
  height: var(--pg-foot) !important;
}

.pg :deep(.nt-block--c > .nt-block__body > .nt-block__arm) {
  width: var(--pg-arm) !important;
}

.pg :deep(.nt-stack > .nt-block--c > .nt-block__foot.nt-block__foot) {
  height: var(--pg-outer-foot) !important;
}

.pg :deep(.nt-stack > .nt-block--c > .nt-block__body > .nt-block__arm.nt-block__arm) {
  width: var(--pg-outer-arm) !important;
}

.overhang-align :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --recess-width: 100% !important;

  margin-right: 0 !important;
}

.overhang-narrow :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --recess-width: 100% !important;

  margin-right: var(--pg-arm) !important;
}

.mouth-page :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --pg-mouth: transparent;
}

.mouth-parent :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --pg-mouth: var(--block-face);
}

.mouth-recess :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --pg-mouth: color-mix(in oklab, var(--block-edge), black 20%);
}

.mouth-wash :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --pg-mouth: color-mix(in oklab, var(--block-face), white 60%);
}

.pg :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --pg-arm-fill: transparent;
  --pg-band: var(--block-edge);

  background:
    linear-gradient(var(--pg-band) 0 0) 0 0 / var(--head-edge-end) var(--block-edge-depth) no-repeat border-box,
    linear-gradient(var(--pg-arm-fill) 0 0) 0 0 / var(--block-groove) 100% no-repeat border-box,
    linear-gradient(var(--pg-mouth) 0 0) 0 var(--block-edge-depth) / var(--head-edge-end) 100% no-repeat border-box !important;
}

.arm-parent :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --pg-arm-fill: var(--block-face);
}

.last-tab-show :deep(.nt-stack > .nt-block:last-child::after),
.last-tab-show :deep(.nt-block__children > .nt-block:last-child::after) {
  display: block !important;
}

.edge-outline :deep(.nt-block--md > .nt-block__cap),
.edge-outline :deep(.nt-block--md > .nt-block__body > .nt-block__arm),
.edge-outline :deep(.nt-block--md > .nt-block__foot),
.edge-outline :deep(.nt-block--md::after),
.edge-outline :deep(.nt-block--c > .nt-block__body > .nt-block__children::before) {
  filter: drop-shadow(1px 0 0 var(--block-edge)) drop-shadow(-1px 0 0 var(--block-edge))
    drop-shadow(0 1px 0 var(--block-edge)) drop-shadow(0 -1px 0 var(--block-edge)) !important;
}

.edge-none :deep(.nt-block--md > .nt-block__cap),
.edge-none :deep(.nt-block--md > .nt-block__body > .nt-block__arm),
.edge-none :deep(.nt-block--md > .nt-block__foot),
.edge-none :deep(.nt-block--md::after),
.edge-none :deep(.nt-block--c > .nt-block__body > .nt-block__children::before) {
  filter: none !important;
}

.edge-outline :deep(.nt-block--c > .nt-block__body > .nt-block__children),
.edge-none :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  --pg-band: transparent;
}
</style>
