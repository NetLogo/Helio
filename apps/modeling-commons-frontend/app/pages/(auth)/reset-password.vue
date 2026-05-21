<template>
  <div class="grid gap-6">
    <AuthPageIntro
      icon="i-lucide-key-round"
      :title="isTokenFlow ? 'Choose a new password' : 'Reset your password'"
      :description="introDescription"
    />

    <UAlert
      v-if="showInvalidTokenMessage"
      title="That reset link is no longer valid"
      description="Request a new password reset email to continue."
      icon="i-lucide-triangle-alert"
      color="warning"
      variant="subtle"
      :closable="false"
    />

    <UAlert
      v-if="requestSucceeded && !isTokenFlow"
      title="Check your inbox"
      :description="successDescription"
      icon="i-lucide-inbox"
      color="success"
      variant="subtle"
      :closable="false"
    />

    <UAlert
      v-if="requestError"
      title="Couldn't send reset email"
      :description="requestError"
      icon="i-lucide-triangle-alert"
      color="error"
      variant="subtle"
      :closable="false"
    />

    <UAlert
      v-if="resetError"
      title="Password reset failed"
      :description="resetError"
      icon="i-lucide-x-circle"
      color="error"
      variant="subtle"
      :closable="false"
    />

    <form v-if="!isTokenFlow" class="grid gap-4" @submit.prevent="requestResetLink">
      <UFormField label="Email">
        <UInput
          v-model="email"
          type="email"
          size="lg"
          icon="i-lucide-mail"
          placeholder="Enter your email"
        />
      </UFormField>

      <UButton type="submit" class="w-full justify-center" :loading="isRequesting" variant="solid">
        Send reset link
      </UButton>
    </form>

    <form v-else class="grid gap-4" @submit.prevent="resetPassword">
      <UFormField label="New password">
        <UInput
          v-model="password"
          type="password"
          size="lg"
          icon="i-lucide-lock"
          placeholder="Enter your new password"
        />
      </UFormField>

      <UFormField label="Confirm password">
        <UInput
          v-model="confirmPassword"
          type="password"
          size="lg"
          icon="i-lucide-shield-check"
          placeholder="Confirm your new password"
        />
      </UFormField>

      <UButton type="submit" class="w-full justify-center" size="lg" :loading="isResetting">
        Reset password
      </UButton>
    </form>

    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <UButton class="justify-center sm:flex-1" color="neutral" variant="outline" :to="returnLink">
        {{ user.isLoggedIn ? "Back to settings" : "Back to login" }}
      </UButton>
      <UButton
        v-if="isTokenFlow"
        class="justify-center sm:flex-1"
        color="neutral"
        variant="ghost"
        @click="returnToRequestForm"
      >
        Need a new link?
      </UButton>
      <UButton
        v-else-if="requestSucceeded"
        class="justify-center sm:flex-1"
        color="neutral"
        variant="ghost"
        @click="tryAnotherEmail"
      >
        Try another email
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { emailOnlyValidator, resetPasswordValidator } from "~/forms/auth";
import { authRoutes } from "~/utils/auth";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Reset password",
  description: "Request a password reset link or choose a new password.",
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const user = useUser();
const { requestPasswordReset, resetPassword: submitPasswordReset } = useAuthActions();
const token = computed(() => (typeof route.query.token === "string" ? route.query.token : null));
const isTokenFlow = computed(() => Boolean(token.value));
const showInvalidTokenMessage = computed(() => route.query.error === "INVALID_TOKEN");
const introDescription = computed(() =>
  isTokenFlow.value
    ? "Enter a new password for your account."
    : "Enter your email address and we'll send a reset link if an account exists.",
);
const email = ref(
  typeof route.query.email === "string"
    ? route.query.email
    : user.value.isLoggedIn
      ? user.value.email
      : "",
);
const password = ref("");
const confirmPassword = ref("");
const isRequesting = ref(false);
const isResetting = ref(false);
const requestSucceeded = ref(false);
const requestedEmail = ref("");
const requestError = ref<string | null>(null);
const resetError = ref<string | null>(null);
const { links } = useSearchParamsNavigation({ query: route.query});
const returnLink = computed(() =>
  user.value.isLoggedIn ? links.value.back.href : authRoutes.login,
);
const successDescription = computed(() => {
  if (!requestedEmail.value) {
    return "If that email exists in our system, you'll receive a reset link shortly.";
  }

  return `If ${requestedEmail.value} is in our system, you'll receive a reset link shortly.`;
});

async function requestResetLink() {
  if (isRequesting.value) {
    return;
  }

  const parsed = emailOnlyValidator.safeParse({ email: email.value });

  if (!parsed.success) {
    requestError.value = parsed.error.issues[0]?.message ?? "Email is required.";
    return;
  }

  requestError.value = null;
  requestSucceeded.value = false;
  resetError.value = null;
  isRequesting.value = true;

  const { error } = await requestPasswordReset({
    email: parsed.data.email,
  });

  isRequesting.value = false;

  if (error) {
    requestError.value =
      error.code === "RESET_PASSWORD_DISABLED"
        ? "Password reset email delivery is not enabled yet for this app."
        : (error.message ?? "We couldn't send a reset email.");
    return;
  }

  email.value = parsed.data.email;
  requestedEmail.value = parsed.data.email;
  requestSucceeded.value = true;

  await navigateTo({
    path: authRoutes.resetPassword,
    query: { email: parsed.data.email },
  });
}

async function resetPassword() {
  if (isResetting.value) {
    return;
  }

  if (!token.value) {
    await navigateTo({ path: authRoutes.resetPassword, query: { error: "INVALID_TOKEN" } });
    return;
  }

  const parsed = resetPasswordValidator.safeParse({
    password: password.value,
    confirmPassword: confirmPassword.value,
  });

  if (!parsed.success) {
    resetError.value = parsed.error.issues[0]?.message ?? "Enter a valid password.";
    return;
  }

  resetError.value = null;
  isResetting.value = true;

  const { error } = await submitPasswordReset({
    token: token.value,
    newPassword: parsed.data.password,
  });

  isResetting.value = false;

  if (error?.code === "INVALID_TOKEN") {
    await navigateTo({ path: authRoutes.resetPassword, query: { error: "INVALID_TOKEN" } });
    return;
  }

  if (error) {
    resetError.value = error.message ?? "We couldn't reset your password.";
    return;
  }

  toast.add({
    title: "Password updated",
    description: user.value.isLoggedIn
      ? "Your password has been updated for this account."
      : "Sign in with your new password.",
    icon: "i-lucide-badge-check",
    color: "success",
  });

  if (user.value.isLoggedIn) {
    await router.push({
      path: "/profile/settings",
      query: { password: "1" },
    });
    return;
  }

  await router.push({ path: authRoutes.login, query: { reset: "1" } });
}

async function returnToRequestForm() {
  requestError.value = null;
  resetError.value = null;
  password.value = "";
  confirmPassword.value = "";
  await navigateTo({
    path: authRoutes.resetPassword,
    query: email.value ? { email: email.value } : {},
  });
}

function tryAnotherEmail() {
  requestSucceeded.value = false;
  requestedEmail.value = "";
  email.value = user.value.isLoggedIn ? user.value.email : "";
}
</script>
