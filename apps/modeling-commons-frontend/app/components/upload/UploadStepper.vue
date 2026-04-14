<template>
  <div class="flex flex-col items-center pt-8">
    <div
      v-for="(step, index) in steps"
      :key="index"
      class="flex flex-col items-center flex-1 min-h-20 w-8"
    >
      <div
        class="flex items-center justify-center size-8 rounded-full border border-neutral-darkest-15 text-base font-normal leading-normal text-text shrink-0"
        :class="{ 'bg-neutral-lightest': index === activeStep }"
      >
        {{ index + 1 }}
      </div>
      <div
        v-if="index < steps.length - 1"
        class="w-px flex-1 min-h-12 bg-neutral-darkest-15 my-3"
        :style="{ height: `${heights[index]}px` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  steps: string[];
  activeStep: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refs: Array<Ref<InstanceType<any>>>;
}>();

const heights = ref<Array<number>>(props.steps.map(() => 0));
const resizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => {
    const index = props.refs.findIndex((ref) => ref.value?.$el === entry.target);
    if (index !== -1) {
      heights.value[index] = entry.contentRect.height;
    }
  });
});

const observedElements = new Set<Element>();

function syncObserver() {
  props.refs.forEach((ref, index) => {
    const el = ref.value?.$el;
    if (el && !observedElements.has(el)) {
      observedElements.add(el);
      resizeObserver.observe(el);
      heights.value[index] = el.getBoundingClientRect().height;
    }
  });
}

onMounted(() => {
  nextTick(syncObserver);
});

watch(
  () => props.refs.map((ref) => ref.value),
  () => nextTick(syncObserver),
);

onUnmounted(() => {
  resizeObserver.disconnect();
});
</script>
