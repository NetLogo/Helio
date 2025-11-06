<template>
  <component :is="icon" />
</template>

<script lang="ts">
// file imported from https://github.com/gitFoxCode/nuxt-icons/blob/89e53649e5868c31fc97869918ede96504ae1a04/src/runtime/components/nuxt-icon.vue
// with modifications

export default {
  props: {
    filled: {
      default: false,
      required: false,
      type: Boolean,
    },
    fontControlled: {
      default: true,
      required: false,
      type: Boolean,
    },
    icon: {
      required: true,
      type: Object,
    },
    name: {
      required: false,
      type: String,
      default: undefined,
    },
  },
}
</script>
