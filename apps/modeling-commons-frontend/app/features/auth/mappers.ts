import type { AuthFormField } from "#ui/types";
import { authLiterals } from "~/features/auth/literals";

export function getSignUpFields(): AuthFormField[] {
  const userKindItems = authLiterals.userKindOptions.map(({ label, value, icon }) => ({
    label,
    value,
    icon,
  }));
  return authLiterals.signUpFields.map((field) =>
    field.name === "userKind" ? { ...field, items: userKindItems } : { ...field },
  );
}
