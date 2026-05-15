<template>
  <UAvatar
    v-if="variant === 'compact'"
    :src="src ?? undefined"
    :alt="displayAlt"
    :text="initials"
    :size="variantProps.avatar.size"
    :class="{ 'opacity-50': pending }"
    :ui="{ ...asRecord(variantProps.avatar.ui), ...asRecord($attrs.ui) }"
    data-variant="compact"
    v-bind="$attrs"
  />
  <div
    v-else-if="variant === 'headline'"
    :class="[variantProps.container, container]"
    data-variant="headline"
  >
    <UAvatar
      :src="src ?? undefined"
      :alt="displayAlt"
      :text="initials"
      :size="variantProps.avatar.size"
      class="size-20 lg:size-8"
      :ui="{ ...asRecord(variantProps.avatar.ui), ...asRecord($attrs.ui) }"
      v-bind="$attrs"
    >
      {{ initials }}
    </UAvatar>
    <div :class="variantProps.infoContainer">
      <p :class="variantProps.name">{{ name }}</p>
      <p :class="variantProps.email">{{ email }}</p>
    </div>
  </div>
  <div v-else :class="[variantProps.container, container]" data-variant="default">
    <UAvatar
      :name="name"
      :src="src ?? undefined"
      :alt="displayAlt"
      :size="variantProps.avatar.size"
      :ui="{ ...asRecord(variantProps.avatar.ui), ...asRecord($attrs.ui) }"
      v-bind="$attrs"
    />
    <span :class="variantProps.name">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<AvatarProps>(), {
  src: "",
  alt: "",
  name: "User",
  email: "",
  variant: "default",
  pending: false,
  container: "",
});

const displayAlt = computed(() => createAltText(props.alt, props.name));
const initials = computed(() => createInitials(props.name));
const variantProps = computed(() => getVariantProps(props.variant));
</script>

<script lang="ts">
type AvatarVariant = "default" | "headline" | "compact";
type AvatarProps = {
  src?: string | null;
  alt?: string | null;
  name?: string | null;
  email?: string | null;
  variant?: AvatarVariant;
  pending?: boolean;
  container?: string;
};

function createInitials(name: string | null): string {
  return (
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function createAltText(alt?: string | null, name?: string | null): string {
  return alt ?? `Avatar for ${name ?? "User"}`;
}

function getVariantProps(variant: AvatarVariant) {
  switch (variant) {
    case "compact":
      return {
        avatar: {
          size: "lg" as Size,
          ui: {
            root: "rounded-full bg-neutral-darkest/5",
            image: "size-full object-cover",
            fallback: "font-semibold",
          },
        },
      };
    case "headline":
      return {
        avatar: {
          size: "sm" as Size,
          ui: {
            fallback: "font-semibold",
          },
        },
        name: "text-sm font-semibold mb-0",
        email: "text-xs text-muted",
        container: "flex flex-col lg:flex-row items-center gap-3 px-1 py-1",
        infoContainer: "min-w-0 group-data-[collapsible=icon]:hidden text-center lg:text-left",
      };
    case "default":
    default:
      return {
        avatar: {
          size: "sm" as Size,
          ui: {
            root: "rounded-full bg-neutral-lighter",
            fallback: "font-semibold",
          },
        },
        name: "text-sm text-muted hidden sm:block",
        container: "flex gap-2 items-center",
      };
  }
}

type Size = "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export function getAvatarPropsForUser(
  user: { name: string; email?: string; image?: string },
  variant: AvatarVariant = "default",
): AvatarProps {
  return {
    name: user.name,
    email: user.email ?? "",
    src: user.image ?? "",
    alt: createAltText(undefined, user.name),
    variant,
    ...getVariantProps(variant),
  };
}
</script>
