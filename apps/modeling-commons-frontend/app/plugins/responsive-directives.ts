import type { Directive, DirectiveBinding } from "vue";

const displayKeys = ["flex", "block", "inline-flex", "inline-block", "grid", "inline"] as const;
type Display = (typeof displayKeys)[number];
type Mode = "from" | "below";

const breakpointKeys = ["sm", "md", "lg", "xl", "2xl"] as const;
type Breakpoint = (typeof breakpointKeys)[number];

function resolveDisplay(binding: DirectiveBinding): Display {
  return (displayKeys.find((d) => binding.modifiers[d]) ?? "flex") as Display;
}

function resolveBreakpoint(binding: DirectiveBinding): Breakpoint {
  const arg = binding.arg as Breakpoint | undefined;
  return arg && breakpointKeys.includes(arg) ? arg : "lg";
}

function apply(el: HTMLElement, binding: DirectiveBinding, mode: Mode) {
  const bp = resolveBreakpoint(binding);
  const display = resolveDisplay(binding);
  const attr = mode === "from" ? "data-show-from" : "data-show-below";
  el.setAttribute(attr, bp);
  el.style.setProperty("--show-display", display);
}

function clear(el: HTMLElement, mode: Mode) {
  const attr = mode === "from" ? "data-show-from" : "data-show-below";
  el.removeAttribute(attr);
  el.style.removeProperty("--show-display");
}

function makeDirective(mode: Mode): Directive<HTMLElement> {
  return {
    beforeMount(el, binding) {
      apply(el, binding, mode);
    },
    updated(el, binding) {
      apply(el, binding, mode);
    },
    unmounted(el) {
      clear(el, mode);
    },
    getSSRProps(binding) {
      const bp = resolveBreakpoint(binding);
      const display = resolveDisplay(binding);
      const attr = mode === "from" ? "data-show-from" : "data-show-below";
      return { [attr]: bp, style: { "--show-display": display } };
    },
  };
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("show-from", makeDirective("from"));
  nuxtApp.vueApp.directive("show-below", makeDirective("below"));
});
