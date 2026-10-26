<template>
  <a v-if="file" :href="href" :target="props.target ?? undefined">
    <slot />
  </a>
  <Anchor v-else :href="href" :target="props.target" :external="external">
    <slot />
  </Anchor>
</template>

<script lang="ts"></script>

<script setup lang="ts">
import type { PropType } from "vue";
type RewriteRule = {
  title: string;
  match: (href: string) => boolean;
  rewrite: (href: string) => string;
};

const {
  public: {
    website: { productWebsite },
  },
} = useRuntimeConfig();

const rewrites: Array<RewriteRule> = [
  {
    title: "no-absolute-site-urls",
    match: (href) => href.startsWith(productWebsite as string),
    rewrite: (href) => href.replace((productWebsite as string).replace(/\/$/, ""), ""),
  },
];

const props = defineProps({
  href: {
    type: String,
    default: "",
  },
  target: {
    type: String as PropType<
      "_blank" | "_parent" | "_self" | "_top" | (string & object) | null | undefined
    >,
    default: undefined,
    required: false,
  },
});

const external = computed(() => {
  return props.href.startsWith("http") || props.href.startsWith("//");
});

// Files such as downloads have no route, so the router must not handle them. Pages may end in .html in the offline build.
const file = computed(() => {
  const path = props.href.split(/[?#]/)[0] ?? "";
  const extension = path.split("/").pop()?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return extension !== undefined && extension !== "html" && !external.value;
});

const href = computed(() =>
  rewrites.reduce((acc, rule) => {
    if (rule.match(acc)) {
      return rule.rewrite(acc);
    }
    return acc;
  }, props.href),
);
</script>
