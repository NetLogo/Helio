<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type * as z from "zod";
import { signUpFields, signUpValidator } from "~/assets/auth";
import { authRoutes, getSafeNextPath } from "~/utils/auth";

definePageMeta({
  layout: "auth",
  middleware: "guest",
});

useSeoMeta({
  title: "Sign up",
  description: "Create an account to get started",
});

const toast = useToast();
const router = useRouter();
const route = useRoute();
const { signUpWithEmail } = useAuthActions();
const hasNextPath = computed(
  () =>
    typeof route.query.next === "string" &&
    route.query.next.startsWith("/") &&
    !route.query.next.startsWith("//"),
);
const nextPath = computed(() => getSafeNextPath(route.query.next));
const loginLink = computed(() =>
  hasNextPath.value
    ? { path: authRoutes.login, query: { next: nextPath.value } }
    : authRoutes.login,
);
const fields = signUpFields;
const schema = signUpValidator;
type Schema = z.output<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  const { name, email, password, userKind } = payload.data;
  const { error } = await signUpWithEmail({
    name,
    email,
    password,
    userKind,
    next: route.query.next,
  });

  if (error) {
    toast.add({
      title: "Signup failed",
      description: error.message ?? "We couldn't create your account.",
      icon: "i-lucide-x-circle",
      color: "error",
    });
    return;
  }

  await router.push({
    path: authRoutes.verifyEmail,
    query: hasNextPath.value
      ? { email: payload.data.email, sent: "1", next: nextPath.value }
      : { email: payload.data.email, sent: "1" },
  });
}
</script>

<template>
  <div>
    <UAuthForm
      ref="authform"
      :fields="fields"
      :schema="schema"
      title="Sign Up"
      loading-auto
      :submit="{
        label: 'Sign Up',
        color: 'primary',
        variant: 'solid',
      }"
      @submit="onSubmit"
    >
      <template #title>
        <h4>Sign Up</h4>
      </template>
      <template #description>
        <span class="text-muted">
          Already have an account?
          <ULink :to="loginLink" class="font-medium text-primary underline">Login</ULink>.
        </span>
      </template>

      <template #footer>
        <span class="text-muted">
          By signing up, you agree to our
          <ULink to="/terms-of-service" class="font-medium text-primary underline">
            Terms of Service </ULink
          >.
        </span>
      </template>
    </UAuthForm>
  </div>
</template>
