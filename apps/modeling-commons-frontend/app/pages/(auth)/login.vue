<template>
  <div class="grid gap-6">
    <LegacyAccountNoticeDialog :next="nextPath" />
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
        <span class="text-muted">
          Don't have an account?
          <ULink :to="signUpLink" class="font-medium text-primary underline">Create one</ULink>.
        </span>
      </template>

      <template #providers>
        <ReclaimAccount  />
        <UButton
          class="w-full justify-center"
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

        <p class="m-0 text-center text-sm text-muted">
          <span class="inline-flex items-center gap-3">
            <span class="h-px w-8 bg-neutral-darkest/10" />
            or continue with email
            <span class="h-px w-8 bg-neutral-darkest/10" />
          </span>
        </p>
      </template>

      <template #password-hint>
        <ULink
          :to="authRoutes.resetPassword"
          class="text-sm font-medium text-neutral-dark underline"
          tabindex="-1"
        >
          Forgot password?
        </ULink>
      </template>

      <template #footer>
        <span class="text-muted">
          By signing in, you agree to our
          <ULink to="/terms-of-service" class="font-medium text-coral-dark underline">
            Terms of Service </ULink
          >.
        </span>
      </template>
    </UAuthForm>
  </div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type * as z from "zod";
import { logInFields, logInValidator } from "~/forms/auth";
import { authRoutes, getPasskeyPromptUrl, getSafeNextPath } from "~/utils/auth";

definePageMeta({
  layout: "auth",
  middleware: "guest",
});

useSeoMeta({
  title: "Log In",
  description: "Log In to your account to continue",
  robots: "noindex, nofollow",
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
      title: getPasskeyErrorCode(error) === "AUTH_CANCELLED" ? "Passkey canceled" : "Passkey sign in failed",
      description: getPasskeyErrorMessage(error) ?? "We couldn't sign you in with a passkey.",
      icon: "i-lucide-key-round",
      color: getPasskeyErrorCode(error) === "AUTH_CANCELLED" ? "warning" : "error",
    });
    return;
  }

  await router.push(nextPath.value);
}

async function onSubmit(payload?: FormSubmitEvent<Schema>): Promise<void> {
  if (!payload) return;
  const { email, password, rememberMe } = payload.data;

  try {
    const { error } = await signInWithEmail({
      email,
      password,
      rememberMe,
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
      showActionFailedToast("Log In", error.message);
      return;
    }
  } catch (error) {
    showActionFailedToast("Log In", (error as Error).message);
    return;
  }

  await router.push(getPasskeyPromptUrl(nextPath.value));
}
</script>
