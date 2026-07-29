<script lang="ts" setup>
import { iconFor } from "./shared";
import type { Notification } from "./shared";

const props = defineProps<{ notification: Notification }>();

const actor = computed(() => props.notification.actor);
const icon = computed(() => iconFor(props.notification.category));

function openActor() {
  if (actor.value?.url) navigateTo(actor.value.url);
}
</script>

<template>
  <button
    v-if="actor?.thumbnailUrl"
    type="button"
    class="shrink-0"
    @click.stop.prevent="openActor"
  >
    <NuxtImg
      :src="actor.thumbnailUrl"
      width="40"
      height="40"
      alt=""
      class="rounded-full size-10 object-cover"
    />
  </button>

  <div
    v-else
    class="shrink-0 size-10 flex justify-center items-center bg-royal-blue-lightest rounded-full"
  >
    <UIcon :name="icon" class="size-4 text-royal-blue" />
  </div>
</template>