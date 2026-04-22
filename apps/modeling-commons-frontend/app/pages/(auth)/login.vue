<template>
  <div class="login-page">
    <UAuthForm
      :fields="fields"
      :schema="schema"
      :title="`Welcome back to ${meta.name}`"
      loading-auto
      :submit="{
        label: 'Log In',
        color: 'primary',
        variant: 'solid',
      }"
      @submit="onSubmit"
    >
      <template #title>
        <h4>Log In</h4>
      </template>
      <template #description>
        <span class="login-page__description">
          Don't have an account?
          <ULink :to="signUpLink" class="login-page__link">Create one</ULink>.
        </span>
      </template>

      <template #providers>
        <UButton
          class="login-page__provider-button"
          color="neutral"
          variant="outline"
          icon="i-lucide-key-round"
          size="lg"
          :loading="isSigningInWithPasskey"
          :disabled="!isPasskeySupported"
          @click="continueWithPasskey"
        >
          Continue with a passkey
        </UButton>

        <p class="login-page__divider">
          <span class="login-page__divider-copy">
            <span class="login-page__divider-line" />
            or continue with email
            <span class="login-page__divider-line" />
          </span>
        </p>
      </template>

      <template #password-hint>
        <ULink :to="authRoutes.resetPassword" class="login-page__password-link" tabindex="-1">
          Forgot password?
        </ULink>
      </template>

      <template #footer>
        <span class="login-page__footer-copy">
          By signing in, you agree to our
          <ULink to="/terms-of-service" class="login-page__footer-link">Terms of Service</ULink>.
        </span>
      </template>
    </UAuthForm>
  </div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type * as z from "zod";
import { authRoutes, getPasskeyPromptUrl, getSafeNextPath } from "~/utils/auth";
import { logInFields, logInValidator } from "./shared";

definePageMeta({
  layout: "auth",
  middleware: "guest",
});

useSeoMeta({
  title: "Login",
  description: "Login to your account to continue",
});

const meta = useWebsite();
const toast = useToast();
const router = useRouter();
const route = useRoute();
const { signInWithEmail } = useAuthActions();
const { isPasskeySupported, signInWithPasskey: startPasskeySignIn } = usePasskeys();
const hasNextPath = computed(
  () =>
    typeof route.query.next === "string" &&
    route.query.next.startsWith("/") &&
    !route.query.next.startsWith("//"),
);
const nextPath = computed(() => getSafeNextPath(route.query.next));
const signUpLink = computed(() =>
  hasNextPath.value
    ? { path: authRoutes.signup, query: { next: nextPath.value } }
    : authRoutes.signup,
);
const isSigningInWithPasskey = ref(false);
const fields = logInFields;
const schema = logInValidator;

type Schema = z.output<typeof schema>;

onMounted(() => {
  const notifications = [];

  if (route.query.verified === "1") {
    notifications.push({
      title: "Email verified",
      description: "You can sign in now.",
      icon: "i-lucide-badge-check",
      color: "success" as const,
    });
  }

  if (route.query.reset === "1") {
    notifications.push({
      title: "Password updated",
      description: "Use your new password to sign in.",
      icon: "i-lucide-key-round",
      color: "success" as const,
    });
  }

  if (!notifications.length) {
    return;
  }

  const nextQuery = { ...route.query };
  delete nextQuery.verified;
  delete nextQuery.reset;
  void router.replace({ query: nextQuery });

  for (const notification of notifications) {
    toast.add(notification);
  }
});

async function continueWithPasskey() {
  if (!isPasskeySupported.value || isSigningInWithPasskey.value) {
    return;
  }

  isSigningInWithPasskey.value = true;

  const { error } = await startPasskeySignIn();

  isSigningInWithPasskey.value = false;

  if (error) {
    toast.add({
      title: error.code === "AUTH_CANCELLED" ? "Passkey canceled" : "Passkey sign in failed",
      description: error.message ?? "We couldn't sign you in with a passkey.",
      icon: "i-lucide-key-round",
      color: error.code === "AUTH_CANCELLED" ? "warning" : "error",
    });
    return;
  }

  await router.push(nextPath.value);
}

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  const { email, password } = payload.data;
  const { error } = await signInWithEmail({
    email,
    password,
    next: route.query.next,
  });

  if (error?.code === "EMAIL_NOT_VERIFIED") {
    await router.push({
      path: authRoutes.verifyEmail,
      query: hasNextPath.value ? { email, next: nextPath.value } : { email },
    });
    return;
  }

  if (error) {
    toast.add({
      title: "Login failed",
      description: error.message ?? "We couldn't sign you in.",
      icon: "i-lucide-x-circle",
      color: "error",
    });
    return;
  }

  await router.push(getPasskeyPromptUrl(nextPath.value));
}
</script>

<style scoped>
.login-page {
  display: grid;
  gap: 1.5rem;
}

.login-page__description {
  color: var(--ui-text-muted);
}

.login-page__link,
.login-page__password-link,
.login-page__footer-link {
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 0.12em;
}

.login-page__link {
  color: var(--ui-color-primary-500);
}

.login-page__password-link {
  color: var(--ui-text);
  font-size: 0.875rem;
}

.login-page__footer-copy {
  color: var(--ui-text-muted);
}

.login-page__footer-link {
  color: var(--ui-color-secondary-500);
}

.login-page__footer-link:hover {
  color: color-mix(in srgb, var(--ui-color-secondary-500) 82%, white);
}

.login-page__provider-button {
  justify-content: center;
  width: 100%;
}

.login-page__divider {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  text-align: center;
}

.login-page__divider-copy {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.login-page__divider-line {
  width: 2rem;
  height: 1px;
  background: color-mix(in srgb, var(--ui-border) 80%, transparent);
}
</style>
