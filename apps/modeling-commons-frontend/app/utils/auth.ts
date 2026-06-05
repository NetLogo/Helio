export const authRoutes = Object.freeze({
  login: "/login",
  signup: "/signup",
  models: "/models",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  passkey: "/passkey",
  onboarding: "/onboarding",
});

function normalizeNextPath(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}

function buildAbsoluteAuthUrl(
  appUrl: string,
  path: string,
  query?: Record<string, string | null | undefined>,
) {
  const url = new URL(path, appUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

export function getSafeNextPath(next: unknown, fallback: string = authRoutes.models) {
  return normalizeNextPath(next) ?? fallback;
}

export function getEmailVerificationCallbackUrl(appUrl: string, next?: unknown) {
  return buildAbsoluteAuthUrl(appUrl, authRoutes.login, {
    verified: "1",
    next: normalizeNextPath(next),
  });
}

export function getResetPasswordRedirectUrl(appUrl: string) {
  return buildAbsoluteAuthUrl(appUrl, authRoutes.resetPassword);
}

export function getPasskeyPromptUrl(next?: unknown) {
  const safeNext = getSafeNextPath(next);
  return `${authRoutes.passkey}?next=${encodeURIComponent(safeNext)}`;
}
