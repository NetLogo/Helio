<template>
  <component
    :is="as"
    class="nt-block"
    :class="[`nt-block--${size}`, `nt-block--${motion}`, { 'nt-block--c': $slots.default, 'nt-block--param': param }]"
    :style="style"
  >
    <span class="nt-block__head"
      >{{ param ? `${label} ` : label
      }}<span v-if="param" class="nt-block__param">{{ param }}</span></span
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

const props = withDefaults(
  defineProps<{
    color: NtBlockColor;
    label: string;
    param?: string;
    size?: "md" | "display";
    as?: string;
    index?: number;
    motion?: "snap" | "drop" | "none";
  }>(),
  { param: undefined, size: "md", as: "div", index: 0, motion: "none" },
);

const style = computed(() => ({
  "--block-face": `var(--color-block-${props.color})`,
  "--block-edge": `var(--color-block-${props.color}-edge)`,
  "--block-ink": `var(--color-block-${props.color}-ink)`,
  "--i": props.index,
}));
</script>

<style scoped>
.nt-block {
  position: relative;
  color: var(--block-ink);
}

.nt-block::after {
  content: "";
  position: absolute;
  background: var(--block-face);
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
  font-weight: 600;
  line-height: 1.25;
  filter: drop-shadow(0 0.214em 0 var(--block-edge));
}

.nt-block--md > .nt-block__head {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  min-height: 2.857em;
  /* These numbers are adjusted for visual alignment -- Omar I. Oct 2 2026 */
  padding: 0.85em 0.714em 0.8em .871em;
  border-radius: calc(var(--radius-block) / 2);
  mask-image: radial-gradient(0.357em 0.286em at 1.429em 0, transparent 98%, black 100%);
}

.nt-block--param > .nt-block__head {
  min-height: 3.214em;
}

.nt-block--md::after {
  bottom: -0.357em;
  left: 1.071em;
  width: 0.714em;
  height: 0.357em;
  border-radius: 0 0 0.357em 0.357em;
}

.nt-block--c > .nt-block__body {
  display: flex;
  min-height: 3.571em;
}

.nt-block--c > .nt-block__body > .nt-block__arm {
  flex: none;
  width: 1.786em;
}

.nt-block--c > .nt-block__body > .nt-block__children {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.nt-block--c > .nt-block__body > .nt-block__children > .nt-block:last-child {
  flex-grow: 1;
}

.nt-block--c > .nt-block__foot {
  height: 1.429em;
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

.nt-block--display > .nt-block__head {
  display: block;
  padding: 0.02em 0.2em 0.06em;
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
