import { config } from "@vue/test-utils";
import { defineComponent, h } from "vue";

// Nuxt Icon fetches icons from a server route that tests don't run, and its late
// "failed to load icon" warnings outlive the worker and fail the run on teardown.
config.global.stubs.Icon = defineComponent({
  name: "Icon",
  props: { name: { type: String, required: true } },
  setup: (props) => () => h("span", { class: ["iconify", props.name], "data-icon": props.name }),
});
