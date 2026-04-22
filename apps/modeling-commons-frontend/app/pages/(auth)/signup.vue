<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type * as z from "zod";
import { authRoutes, getSafeNextPath } from "~/utils/auth";
import { signUpFields, signUpValidator } from "./shared";

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
  <div class="signup-page">
    <UAuthForm
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
        <span class="signup-page__description">
          Already have an account?
          <ULink :to="loginLink" class="signup-page__link">Login</ULink>.
        </span>
      </template>

      <template #footer>
        <span class="signup-page__footer-copy">
          By signing up, you agree to our
          <ULink to="/terms-of-service" class="signup-page__link">Terms of Service</ULink>.
        </span>
      </template>
    </UAuthForm>
  </div>
</template>

<style lang="css" scoped>
.signup-page {
  display: grid;
}

.signup-page__description,
.signup-page__footer-copy {
  color: var(--ui-text-muted);
}

.signup-page__link {
  color: var(--ui-color-primary-500);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 0.12em;
}

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
