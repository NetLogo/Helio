<template>
  <Error :icon="icon" :title="title" :message="message">
    <UButton v-if="kind === 'transient'" variant="outline" @click="$emit('retry')">
      Try again
    </UButton>
    <UButton v-else-if="kind === 'notFound'" variant="outline" to="/models">
      Browse models
    </UButton>
    <UButton v-else-if="kind === 'accessDenied' && !isLoggedIn" variant="outline" :to="loginPath">
      Sign in
    </UButton>
  </Error>
</template>

<script setup lang="ts">
const props = defineProps<{ error?: unknown }>();

defineEmits<{ retry: [] }>();

const route = useRoute();
const user = useUser();
const isLoggedIn = computed(() => user.value.isLoggedIn);

type ErrorKind = "notFound" | "accessDenied" | "transient";

const kind = computed<ErrorKind>(() => {
  if (getErrorStatus(props.error) === 404) return "notFound";
  if (isAccessDeniedError(props.error)) return "accessDenied";
  return "transient";
});

const icon = computed(() => {
  switch (kind.value) {
    case "notFound":
      return "i-lucide-search-x";
    case "accessDenied":
      return "i-lucide-lock";
    default:
      return "i-lucide-wifi-off";
  }
});

const title = computed(() => {
  switch (kind.value) {
    case "notFound":
      return "Model not found";
    case "accessDenied":
      return defaultStrings.privateModelName;
    default:
      return (props.error as { message?: string } | null)?.message || "Something went wrong";
  }
});

const message = computed(() => {
  switch (kind.value) {
    case "notFound":
      return defaultStrings.unavailableModelDescription;
    case "accessDenied":
      return isLoggedIn.value
        ? "You don't have permission to view this model."
        : defaultStrings.privateModelDescription;
    default:
      return "We are having trouble loading the model. Please check your connection and try again.";
  }
});

const loginPath = computed(() => `${authRoutes.login}?next=${encodeURIComponent(route.fullPath)}`);
</script>
