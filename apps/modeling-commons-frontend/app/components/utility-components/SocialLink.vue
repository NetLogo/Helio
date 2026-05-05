<template>
  <a
    :href="sanitizeUrl(url)"
    target="_blank"
    class="inline-flex gap-2 items-center underline group/social"
  >
    <UIcon
      :name="model?.icon || 'i-lucide-link-2'"
      class="shrink-0 text-muted group-hover/social:text-royal-blue"
    />
    <span v-if="variant !== 'compact'">
      {{ display }}
    </span>
  </a>
</template>

<script lang="ts">
import * as z from "zod";

const id = <T,>(i: T): T => i;
const socialMediaLinksKinds = [
  {
    value: "website",
    label: "Personal website",
    placeholder: "https://www.mywebsite.com",
    icon: "iconoir:www",
    schema: z
      .url("Invalid URL. Make sure to include https:// at the beginning of your URL")
      .optional(),
    toUrl: (input: string) => new URL(input).href,
    toDisplay: id,
  },
  {
    value: "netlogo-forum",
    label: "NetLogo Forum",
    placeholder: "NetLogo Forum Profile URL",
    icon: "netlogo-netlogo-desktop",
    schema: z
      .url("Invalid URL. Make sure to include https:// at the beginning of your URL")
      .optional(),
    toUrl: (input: string) => new URL(input).href,
    toDisplay: id,
  },
  {
    value: "x",
    label: "X",
    placeholder: "@handle",
    icon: "prime:twitter",
    schema: z
      .string()
      .regex(/^@?[a-zA-Z0-9_]+$/, "Invalid X handle.")
      .min(3, "X handles must be at least 3 characters long")
      .max(16, "X handles cannot be longer than 16 characters")
      .optional(),
    toUrl: (input: string) => `https://x.com/${input.replace(/^@/, "")}`,
    toDisplay: (input: string) => `@${input.replace(/^@/, "")}`,
  },
  {
    value: "github",
    label: "GitHub",
    placeholder: "GitHub Username",
    icon: "mdi:github",
    schema: z
      .string()
      .regex(/^@?[a-zA-Z0-9-]+$/, "Invalid GitHub username.")
      .regex(/--/, "GitHub usernames cannot contain consecutive hyphens.")
      .min(1, "GitHub username cannot be empty")
      .max(39, "GitHub usernames cannot be longer than 39 characters")
      .optional(),
    toUrl: (input: string) => `https://github.com/${input.replace(/^@/, "")}`,
    toDisplay: id,
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    placeholder: "LinkedIn Profile URL",
    icon: "mdi:linkedin",
    schema: z
      .url()
      .regex(/^https?:\/\/(www\.)?linkedin\.com\/.*$/, "Invalid LinkedIn URL.")
      .optional(),
    toUrl: (input: string) => new URL(input).href,
    toDisplay: id,
  },
  {
    value: "google-scholar",
    label: "Google Scholar",
    placeholder: "Google Scholar Profile URL",
    icon: "academicons:google-scholar",
    schema: z
      .url()
      .regex(
        /^https?:\/\/(scholar\.google\.com|.*\.scholar\.google\.com)\/.*$/,
        "Invalid Google Scholar URL.",
      )
      .optional(),
    toUrl: (input: string) => new URL(input).href,
    toDisplay: id,
  },
];

export type SocialMediaLinkType = (typeof socialMediaLinksKinds)[number]["value"];
export type SocialMediaLink = {
  type: SocialMediaLinkType;
  rawValue: string;
};
export { socialMediaLinksKinds };
</script>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<
    SocialMediaLink & {
      variant?: "default" | "compact";
    }
  >(),
  {
    variant: "default",
  },
);
const model = computed(() => socialMediaLinksKinds.find((i) => i.value === props.type));
const url = computed(() => model.value?.toUrl(props.rawValue) ?? props.rawValue);
const display = computed(() => model.value?.toDisplay(props.rawValue) ?? props.rawValue);
</script>
