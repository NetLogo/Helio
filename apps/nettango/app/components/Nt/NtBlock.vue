<template>
  <component
    :is="as"
    class="nt-block"
    :class="[`nt-block--${size}`, `nt-block--${motion}`, { 'nt-block--c': $slots.default, 'nt-block--param': param }]"
    :style="style"
  >
    <span class="nt-block__cap"
      ><span class="nt-block__head"
        >{{ param ? `${label} ` : label
        }}<span v-if="param" class="nt-block__param">{{ param }}</span></span
      ></span
    >
    <template v-if="$slots.default">
      <div class="nt-block__body">
        <div class="nt-block__arm" aria-hidden="true" />
        <div class="nt-block__children">
          <slot />
        </div>
      </div>
      <div class="nt-block__foot" aria-hidden="true" />
    </template>
  </component>
</template>

<script setup lang="ts">
export type NtBlockColor = "green" | "red" | "blue" | "yellow" | "orange" | "purple";
export type NtBlockSize = "md" | "display";

const props = withDefaults(
  defineProps<{
    color: NtBlockColor;
    label: string;
    param?: string;
    size?: NtBlockSize;
    as?: string;
    index?: number;
    motion?: "snap" | "drop" | "none";
  }>(),
  { param: undefined, size: "md", as: "div", index: 0, motion: "none" },
);

const style = computed(() => {
  const token = getBlockTokenKey(props.color, props.size);
  return {
    "--block-face": `var(--color-block-${token})`,
    "--block-edge": `var(--color-block-${token}-edge)`,
    "--block-ink": `var(--color-block-${token}-ink)`,
    "--i": props.index,
  };
});
</script>

<style scoped>
.nt-block {
  --block-edge-depth: 0.214em;
  --block-groove: 0.32em;
  --block-corner: calc(var(--radius-block) / 2);
  /*
    A tab hangs from a block across the gap to the next one and reaches into its notch. The notch is the tab plus
    play on each side and below, so the tab reads as dropping into a hole. Every gap between blocks, top level or
    nested, is --block-gap, so one tab length fits everywhere.
  */
  --tab-x: 1.071em;
  --tab-width: 1em;
  --tab-reach: 0.214em;
  --block-gap: 0.357em;
  --tab-height: calc(var(--block-gap) + var(--tab-reach));
  --notch-play: 0.143em;
  /* An empty notch is the size of the block's own visible tab: its width, and its face below the edge. */
  --notch-rx: calc(var(--tab-width) / 2);
  --notch-ry: calc(var(--tab-height) - var(--block-edge-depth));

  position: relative;
  color: var(--block-ink);
}

.nt-block::after {
  content: "";
  position: absolute;
  background: var(--block-face);
}

/* A notch that a tab drops into gets play around the tab, so the tab reads as sitting in a hole. */
.nt-block + .nt-block,
.nt-block__children > .nt-block:first-child {
  --notch-rx: calc(var(--tab-width) / 2 + var(--notch-play));
  --notch-ry: calc(var(--tab-reach) + var(--block-edge-depth) + var(--notch-play));
}

/* Only the last block of a stack or of a C block's mouth drops its tab; a block standing alone keeps it. */
.nt-stack > .nt-block:last-child::after,
.nt-block__children > .nt-block:last-child::after {
  display: none;
}

.nt-block__head,
.nt-block__arm,
.nt-block__foot {
  background: var(--block-face);
}

.nt-block--md {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.25;
}

/*
  The edge goes on each part instead of the whole block, so a C block's filter never paints its edge colour behind
  the nested blocks. The cap wraps the head because the head's notch mask would clip a filter on the head itself.
*/
.nt-block--md > .nt-block__cap,
.nt-block--md > .nt-block__body > .nt-block__arm,
.nt-block--md > .nt-block__foot,
.nt-block--md::after {
  filter: drop-shadow(0 var(--block-edge-depth) 0 var(--block-edge));
}

.nt-block--md > .nt-block__cap {
  display: flex;
  flex: 1;
}

.nt-block--md > .nt-block__cap > .nt-block__head {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  min-height: 2.857em;
  /* These numbers are adjusted for visual alignment -- Omar I. Oct 2 2026 */
  padding: 0.85em 0.714em 0.8em .871em;
  border-radius: var(--block-corner);
  mask-image: radial-gradient(
    var(--notch-rx) var(--notch-ry) at calc(var(--tab-x) + var(--tab-width) / 2) 0,
    transparent 98%,
    black 100%
  );
}

.nt-block--param > .nt-block__cap > .nt-block__head {
  min-height: 3.214em;
}

.nt-block--md::after,
.nt-block--c > .nt-block__body > .nt-block__children::before {
  width: var(--tab-width);
  height: var(--tab-height);
  border-radius: 0 0 calc(var(--tab-width) / 2) calc(var(--tab-width) / 2);
}

.nt-block--md::after {
  bottom: calc(var(--tab-height) * -1);
  left: var(--tab-x);
}

.nt-block--c > .nt-block__cap > .nt-block__head {
  border-bottom-left-radius: 0;
}

.nt-block--c > .nt-block__body {
  display: flex;
  min-height: 3.571em;
}

/* The arm overlaps the head above and the foot below by a hair so the C reads as one piece with no seams. */
.nt-block--c > .nt-block__body > .nt-block__arm {
  flex: none;
  width: 1.786em;
  margin-block: -0.05em;
}

.nt-block--c > .nt-block__body > .nt-block__children::before {
  content: "";
  position: absolute;
  top: 0;
  left: calc(var(--block-groove) + var(--tab-x));
  background: var(--block-face);
  filter: drop-shadow(0 var(--block-edge-depth) 0 var(--block-edge));
}

/*
  The head's edge is repainted across the mouth, ending one corner radius short of the right so the head's own
  rounded edge shows under its corner.
*/
.nt-block--c > .nt-block__body > .nt-block__children {
  --head-edge-end: calc(100% - var(--block-corner));

  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding-top: var(--block-gap);
  padding-bottom: var(--block-gap);
  padding-left: var(--block-groove);
  background: linear-gradient(var(--block-edge) 0 0) 0 0 / var(--head-edge-end) var(--block-edge-depth) no-repeat border-box;
}

/* The gap goes on the block rather than its container so a stack and a C block's mouth share one value. */
.nt-block--md + .nt-block--md {
  margin-top: var(--block-gap);
}

.nt-block--c > .nt-block__body > .nt-block__children > .nt-block:last-child {
  flex-grow: 1;
}

.nt-block--c > .nt-block__foot {
  height: 1.429em;
  border-radius: 0 var(--block-corner) var(--block-corner);
}

.nt-block__param {
  margin-left: 0.3em;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}

.nt-block--display {
  display: inline-block;
  margin-right: 0.08em;
  filter: drop-shadow(0 0.07em 0 var(--block-edge)) drop-shadow(var(--drop-shadow-block));
  transform: rotate(-2.5deg);
  transform-origin: 30% 80%;
}

.nt-block--display > .nt-block__cap {
  display: block;
}

.nt-block--display > .nt-block__cap > .nt-block__head {
  display: block;
  /* Fitted to Nunito 900 at line-height 1: about 0.16em clear above the ascenders and 0.17em below the baseline. */
  padding: 0.075em 0.2em 0;
  line-height: 1;
  border-radius: 0.11em;
  mask-image: radial-gradient(0.23em 0.13em at 0.55em 0, transparent 98%, black 100%);
}

.nt-block--display::after {
  bottom: -0.12em;
  left: 0.32em;
  width: 0.46em;
  height: 0.13em;
  border-radius: 0 0 0.3em 0.3em;
}

@media (prefers-reduced-motion: no-preference) {
  .nt-block--snap {
    animation: var(--animate-snap);
    animation-delay: calc(320ms + var(--i) * 120ms);
  }

  .nt-block--drop {
    animation: var(--animate-drop-in);
  }
}
</style>
