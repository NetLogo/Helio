<script setup lang="ts">
import { UFieldGroup } from "#components";
import { socialMediaLinksKinds } from "./SocialLink.vue";

const props = defineProps<{
  onePerKind?: boolean;
}>();

const links = defineModel<Array<{ type: string; rawValue: string }>>({
  required: true,
});
const items = computed(() => {
  if (props.onePerKind) {
    const seenKinds = new Set<string>(links.value.map((link) => link.type));
    return socialMediaLinksKinds.filter((item) => {
      if (seenKinds.has(item.value)) {
        return false;
      }
      return true;
    });
  }
  return socialMediaLinksKinds;
});

const model = ref(items.value[0]);

const currentInput = ref("");

const error = ref<string | null>(null);
const addLink = () => {
  if (!model.value || !currentInput.value) {
    return;
  }
  const { value, schema } = model.value;
  const { data, error: parseError } = schema.safeParse(currentInput.value); // Will throw if invalid, preventing addition
  if (!data) {
    error.value = parseError?.issues[0]?.message ?? "Invalid input";
    return;
  }
  links.value.push({
    type: value,
    rawValue: currentInput.value,
  });
  currentInput.value = "";
  error.value = null;
};
</script>

<template>
  <section>
    <UFieldGroup class="w-full">
      <USelectMenu v-model="model" class="min-w-50" :items="items" />
      <UInput
        v-model="currentInput"
        :placeholder="model?.placeholder"
        size="md"
        name="userLink"
        :class="{
          'ring-error': Boolean(error),
        }"
        @keyup.enter="addLink()"
      />
      <UButton
        color="primary"
        variant="outline"
        square
        icon="i-lucide-plus"
        size="sm"
        @click="addLink()"
      />
    </UFieldGroup>
    <span v-if="error" class="text-xs text-error mt-1">{{ error }}</span>
    <div class="">
      <div
        v-for="(link, index) in links"
        :key="index"
        class="flex justify-between w-full mt-2 px-2 hover:bg-royal-blue-lightest/50 rounded-xl"
      >
        <SocialLink :type="link.type" :raw-value="link.rawValue" />
        <UButton
          color="neutral"
          variant="link"
          square
          icon="i-lucide-x"
          size="xs"
          @click="links.splice(index, 1)"
        />
      </div>
    </div>
  </section>
</template>
