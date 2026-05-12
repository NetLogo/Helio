export default function useAuthResponse() {
  const auth = useNuxtApp().$auth;
  const {
    client: { $ERROR_CODES: codes },
  } = auth;

  function handleError(
    result: { error?: { message?: string; code?: string } | null } | undefined | null,
  ) {
    if (!result || !result.error) return;
    if (result.error) {
      switch (result.error.code) {
        case codes.ACCOUNT_NOT_FOUND.code:
          throw new Error("No account found with the provided credentials.");
        case codes.EMAIL_NOT_VERIFIED.code:
          throw new Error(
            "Your email address has not been verified. Please check your inbox for a verification email.",
          );
        case codes.BANNED_USER.code:
          throw new Error(
            "Your account cannot be accessed at this time. Please contact support for assistance.",
          );
        case codes.PASSWORD_ALREADY_SET.code:
          throw new Error(
            "A password has already been set for this account. Please use the password reset option if you've forgotten your password.",
          );
        case codes.PASSWORD_TOO_LONG.code:
          throw new Error("The password you entered is too long.");
        case codes.PASSWORD_TOO_SHORT.code:
          throw new Error("The password you entered is too short.");
        case codes.INVALID_EMAIL_OR_PASSWORD.code:
          throw new Error("The email or password you entered is incorrect.");
        case codes.INVALID_PASSWORD.code:
          throw new Error("The email or password you entered is incorrect.");
        default:
          throw new Error(
            result.error.message || "An unexpected error occurred. Please try again.",
          );
      }
    }
  }

  return { handleError };
}
