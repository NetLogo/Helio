<template>
  <div class="verify-email-page">
    <AuthPageIntro
      icon="i-lucide-mail-check"
      title="Verify your email address"
      :description="`In order to start contributing to ${website.name}, you'll need to verify your email address.`"
    />

    <UAlert
      :description="statusDescription"
      icon="i-lucide-inbox"
      color="secondary"
      variant="subtle"
      :closable="false"
    />

    <form class="verify-email-page__form" @submit.prevent="resendVerification">
      <UFormField label="Email">
        <UInput
          v-model="email"
          type="email"
          size="lg"
          icon="i-lucide-mail"
          placeholder="Enter your email"
          disabled
        />
      </UFormField>

      <UButton
        type="submit"
        class="verify-email-page__submit"
        size="lg"
        :loading="isSubmitting"
        :disabled="!canResend"
      >
        {{ resendButtonLabel }}
      </UButton>
    </form>

    <UButton class="verify-email-page__submit" size="sm" variant="solid" :to="signUpLink">
      Use a different email
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { authRoutes, getSafeNextPath } from "~/utils/auth";
import { emailOnlyValidator } from "./shared";

definePageMeta({
  layout: "auth",
  middleware: "guest",
});

useSeoMeta({
  title: "Verify your email address",
  description: "Check your inbox and verify your email address to continue.",
});

const COOLDOWN_SECONDS = 60 * 5;

const website = useWebsite();
const toast = useToast();
const router = useRouter();
const route = useRoute();
const { sendVerificationEmail } = useAuthActions();
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
const email = ref(typeof route.query.email === "string" ? route.query.email : "");
const isSubmitting = ref(false);
const cooldown = ref(-1);
const cooldownInterval = ref<ReturnType<typeof setInterval> | null>(null);
const canResend = computed(() => cooldown.value <= 0);
const resendButtonLabel = computed(() =>
  canResend.value ? "Resend verification email" : `Resend again in ${cooldown.value}s`,
);

const statusDescription = computed(() => {
  if (email.value) {
    return `We${route.query.sent === "1" ? "" : " can"} send a verification link to ${email.value}.`;
  }

  return "Enter the address tied to your account and we'll send a verification link.";
});

async function resendVerification() {
  const parsed = emailOnlyValidator.safeParse({ email: email.value });

  if (!parsed.success) {
    toast.add({
      title: "Enter a valid email",
      description: parsed.error.issues[0]?.message ?? "Email is required.",
      icon: "i-lucide-mail-warning",
      color: "error",
    });
    return;
  }

  isSubmitting.value = true;

  const { error } = await sendVerificationEmail({
    email: parsed.data.email,
    next: route.query.next,
  });

  isSubmitting.value = false;

  if (error) {
    toast.add({
      title: "Couldn't send verification email",
      description: error.message ?? "Please try again in a moment.",
      icon: "i-lucide-x-circle",
      color: "error",
    });
    return;
  } else {
    toast.add({
      title: "Verification Email Sent",
      description: "Please check your inbox for a fresh verification link.",
      icon: "i-lucide-badge-check",
      color: "success",
    });
  }

  email.value = parsed.data.email;
  triggerCooldown();

  await router.replace({
    path: authRoutes.verifyEmail,
    query: hasNextPath.value
      ? { email: parsed.data.email, sent: "1", next: nextPath.value }
      : { email: parsed.data.email, sent: "1" },
  });
}

const triggerCooldown = () => {
  cooldown.value = COOLDOWN_SECONDS;

  const interval = setInterval(() => {
    cooldown.value -= 1;

    if (cooldown.value <= 0) {
      clearInterval(interval);
      cooldown.value = -1;
    }
  }, 1000);

  cooldownInterval.value = interval;
};

onBeforeUnmount(() => {
  if (cooldownInterval.value) {
    clearInterval(cooldownInterval.value);
  }
});
</script>

<style scoped>
.verify-email-page {
  display: grid;
  gap: 1.5rem;
}

.verify-email-page__form {
  display: grid;
  gap: 1rem;
}

.verify-email-page__submit {
  justify-content: center;
  width: 100%;
}
</style>
