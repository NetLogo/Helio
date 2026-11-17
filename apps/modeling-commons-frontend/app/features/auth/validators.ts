import { authRules } from "@repo/modeling-commons-shared";
import type { infer as Infer } from "zod";
import { authLiterals } from "~/features/auth/literals";
import { fillTemplate } from "~/utils/formatters";

const z = await import("zod");

function getMinLengthMessage(min: number): string {
  return fillTemplate(authLiterals.validation.minLength, { min });
}

function getMaxLengthMessage(max: number): string {
  return fillTemplate(authLiterals.validation.maxLength, { max });
}

export const nameValidator = z
  .string("Name is required")
  .min(authRules.name.length.min, getMinLengthMessage(authRules.name.length.min))
  .max(authRules.name.length.max, getMaxLengthMessage(authRules.name.length.max));
export const emailValidator = z.email("Must be a valid email address");

export const miniPasswordValidator = z
  .string("Password is required")
  .min(authRules.password.length.min, getMinLengthMessage(authRules.password.length.min))
  .max(authRules.password.length.max, getMaxLengthMessage(authRules.password.length.max));
export const passwordValidator = authRules.password.complexity.reduce(
  (validator, rule) =>
    validator.regex(rule.pattern, authLiterals.validation.passwordComplexity[rule.key]),
  miniPasswordValidator,
);

export const userKindValidator = z.enum(["student", "teacher", "researcher", "other"]).optional();
export type UserKind = Infer<typeof userKindValidator>;

export const logInValidator = z.object({
  email: emailValidator,
  password: miniPasswordValidator,
  rememberMe: z.optional(z.boolean()),
});

export const emailOnlyValidator = z.object({
  email: emailValidator,
});

export const resetPasswordValidator = z
  .object({
    password: passwordValidator,
    confirmPassword: z.string("Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordValidator = z
  .object({
    currentPassword: miniPasswordValidator,
    newPassword: passwordValidator,
    confirmNewPassword: z.string("Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password cannot be the same as current password",
    path: ["newPassword"],
  });

export const changeEmailValidator = z.object({
  newEmail: emailValidator,
});

export const signUpValidator = z
  .object({
    name: nameValidator,
    email: emailValidator,
    password: passwordValidator,
    confirmPassword: z.string("Please confirm your password"),
    userKind: z
      .object({
        value: userKindValidator,
      })
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.password !== data.email, {
    message: "Password cannot be the same as email",
    path: ["password"],
  })
  .refine((data) => data.password !== data.name, {
    message: "Password cannot be the same as name",
    path: ["password"],
  });
