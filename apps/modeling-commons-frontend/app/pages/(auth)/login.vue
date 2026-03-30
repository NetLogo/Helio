<template>
  <div>
    <UAuthForm
      :fields="fields"
      :schema="schema"
      :providers="providers"
      :title="`Welcome back to ${meta.name}`"
      icon="i-lucide-lock"
      @submit="onSubmit"
    >
      <template #description>
        Don't have an account? <ULink to="/signup" class="text-primary font-medium">Sign up</ULink>.
      </template>

      <template #password-hint>
        <ULink to="/" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
      </template>

      <template #footer>
        By signing in, you agree to our
        <ULink to="/" class="text-primary font-medium">Terms of Service</ULink>.
      </template>
    </UAuthForm>
  </div>
</template>

<script setup lang="ts">
import type * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { logInFields, logInValidator, providers } from "./shared";

definePageMeta({
  layout: "auth",
  middleware: "guest",
});

useSeoMeta({
  title: "Login",
  description: "Login to your account to continue",
});

const meta = useWebsite();
const appUrl = useRuntimeConfig().public.appUrl;
const toast = useToast();
const auth = useNuxtApp().$auth;

const fields = logInFields;
const schema = logInValidator;

type Schema = z.output<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  const { email, password } = payload.data;
  await auth.client.signIn.email({
    email,
    password,
    callbackURL: `${appUrl}/models`,
  }, {
    onRequest() {
      toast.add({
        title: "Logging in",
        description: "Please wait while we log you in...",
        icon: "i-lucide-loader-2",
        color: "info",
        duration: 3000,
      });
    },
    onSuccess() {
      navigateTo("/models");
    },
    onError(ctx) {
       toast.add({
        title: "Login failed",
        description: ctx.error.message,
        icon: "i-lucide-x-circle",
        color: "error",
      });
    },
  });
}
</script>
