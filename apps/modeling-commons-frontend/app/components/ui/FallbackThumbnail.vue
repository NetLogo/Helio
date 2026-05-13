<template>
  <img :src="thumbnailUrl" class="w-full h-full object-cover" :class="cls" />
</template>

<script setup lang="ts">
import NoPreview from "@repo/vue-ui/assets/no_preview.svg?url";
import NoPreviewRadialBlue from "@repo/vue-ui/assets/no_preview_radial_blue.svg?url";
import NoPreviewSpiralBlue from "@repo/vue-ui/assets/no_preview_spiral_blue.svg?url";
import NoPreviewSpiralGray from "@repo/vue-ui/assets/no_preview_spiral_gray.svg?url";
import ShowNoPreview from "@repo/vue-ui/assets/show_no_preview.svg?url";
import ShowNoPreview1 from "@repo/vue-ui/assets/show_no_preview_1.svg?url";
import TurtleCenteredDark from "@repo/vue-ui/assets/turtle_centered_dark.svg?url";
import TurtleCenteredLight from "@repo/vue-ui/assets/turtle_centered_light.svg?url";
import TurtleTessellationCoral from "@repo/vue-ui/assets/turtle_pattern_tessellation_coral.svg?url";
import TurtleTessellationIndigo from "@repo/vue-ui/assets/turtle_pattern_tessellation_indigo.svg?url";

const thumbnails = [
  [ShowNoPreview, "object-[45%]"],
  [ShowNoPreview1, "object-[45%]"],
  [NoPreview, ""],
  [NoPreviewSpiralGray, ""],
  [NoPreviewSpiralBlue, ""],
  [NoPreviewRadialBlue, ""],
  [TurtleCenteredLight, ""],
  [TurtleCenteredDark, ""],
  [TurtleTessellationCoral, ""],
  [TurtleTessellationIndigo, ""],
] as const;
const [thumbnailUrl, cls] = thumbnails[3];
</script>
