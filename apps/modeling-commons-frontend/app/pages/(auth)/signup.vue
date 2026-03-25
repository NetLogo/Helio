<script setup lang="ts">
import type * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { getSignUpCallbackUrl, providers, signUpFields, signUpValidator } from "./shared";

definePageMeta({
  layout: "auth",
  middleware: "guest",
});

useSeoMeta({
  title: "Sign up",
  description: "Create an account to get started",
});

const toast = useToast();
const auth = useNuxtApp().$auth;
const fields = signUpFields;
const schema = signUpValidator;
type Schema = z.output<typeof schema>;

const form = useTemplateRef("form");

watch(
  () => form.value,
  () => {
    if (form.value) {
      console.log(form.value.formRef);
    }
  },
);

function onSubmit(payload: FormSubmitEvent<Schema>) {
  auth.client.signUp
    .email({
      ...payload.data,
      callbackURL: getSignUpCallbackUrl(),
    })
    .then(({ error }: { error: Error }) => {
      if (error) {
        toast.clear();
        toast.add({
          title: "Signup failed",
          description: error.message,
          icon: "i-lucide-x-circle",
          color: "error",
        });
      } else {
        toast.add({
          title: "Signup successful",
          description: "Please check your email to confirm your account",
          icon: "i-lucide-check-circle",
          color: "success",
        });
        navigateTo("/login");
      }
    });
}
</script>

<template>
  <UAuthForm
    ref="form"
    :fields="fields"
    :schema="schema"
    :providers="providers"
    title="Create an account"
    :submit="{ label: 'Create account' }"
    icon="i-lucide-user-plus"
    loading-auto
    @submit="onSubmit"
  >
    <template #description>
      Already have an account? <ULink to="/login" class="text-primary font-medium">Login</ULink>.
    </template>

    <template #footer>
      By signing up, you agree to our
      <ULink to="/" class="text-primary font-medium">Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>

<style lang="css" scoped>
:deep([data-slot="error"]) {
  transition: all 0.3s ease;
  max-height: 0;
  animation: fadeIn 1.5s var(--easy-easing) forwards;
}

@keyframes fadeIn {
  to {
    max-height: 10rem;
  }
}
</style>
