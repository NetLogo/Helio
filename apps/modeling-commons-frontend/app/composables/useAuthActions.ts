import { getEmailVerificationCallbackUrl, getResetPasswordRedirectUrl } from "~/utils/auth";

type AuthUserKind = "student" | "teacher" | "researcher" | "other";

interface SignInWithEmailInput {
  email: string;
  password: string;
  next?: unknown;
}

interface SignUpWithEmailInput {
  email: string;
  name: string;
  password: string;
  userKind?: AuthUserKind;
  next?: unknown;
}

interface SendVerificationEmailInput {
  email: string;
  next?: unknown;
}

interface RequestPasswordResetInput {
  email: string;
}

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export default function useAuthActions() {
  const auth = useNuxtApp().$auth;
  const appUrl = useRuntimeConfig().public.appUrl as string;

  function signInWithEmail({ next, ...input }: SignInWithEmailInput) {
    return auth.client.signIn.email({
      ...input,
      callbackURL: getEmailVerificationCallbackUrl(appUrl, next),
    });
  }

  function signUpWithEmail({ next, email, name, password, userKind }: SignUpWithEmailInput) {
    return auth.client.signUp.email({
      email,
      name,
      password,
      userKind,
      callbackURL: getEmailVerificationCallbackUrl(appUrl, next),
    });
  }

  function sendVerificationEmail({ email, next }: SendVerificationEmailInput) {
    return auth.client.sendVerificationEmail({
      email,
      callbackURL: getEmailVerificationCallbackUrl(appUrl, next),
    });
  }

  function requestPasswordReset({ email }: RequestPasswordResetInput) {
    return auth.client.requestPasswordReset({
      email,
      redirectTo: getResetPasswordRedirectUrl(appUrl),
    });
  }

  function resetPassword({ token, newPassword }: ResetPasswordInput) {
    return auth.client.resetPassword({
      token,
      newPassword,
    });
  }

  function signOut() {
    return auth.client.signOut();
  }

  return {
    signInWithEmail,
    signUpWithEmail,
    sendVerificationEmail,
    requestPasswordReset,
    resetPassword,
    signOut,
  };
}
