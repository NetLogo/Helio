import type { AuthFormField } from "#ui/types";
import * as z from "zod";

export const providers: Array<{ label: string; icon: string; onClick: () => void }> = [];

export const nameValidator = z
  .string()
  .min(2, "Must be at least 2 characters")
  .max(50, "Must be less than 50 characters");
export const emailValidator = z.email("Invalid email address");

export const passwordValidator = z
  .string()
  .min(8, "Must be at least 8 characters")
  .max(24, "Must be less than 24 characters")
  .regex(/[A-Za-z]/, "Must contain at least one letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[@$!%*?&]/, "Must contain at least one special character (@$!%*?&)")
  .regex(/^\S*$/, "Cannot contain spaces");

export const logInValidator = z.object({
  email: emailValidator,
  password: passwordValidator,
});

export const logInFields = [
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password" as const,
    placeholder: "Enter your password",
  },
];

export const signUpValidator = z
  .object({
    name: nameValidator,
    email: emailValidator,
    password: passwordValidator,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
  })
  .refine((data) => data.password !== data.email, {
    message: "Password cannot be the same as email",
  })
  .refine((data) => data.password !== data.name, {
    message: "Password cannot be the same as name",
  });

export const signUpFields: Array<AuthFormField> = [
  {
    name: "name",
    type: "text" as const,
    label: "Name",
    placeholder: "Enter your name",
    required: true,
  },
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password" as const,
    placeholder: "Create a password",
  },
  {
    name: "confirmPassword",
    label: "Confirm Password",
    type: "password" as const,
    placeholder: "Confirm your password",
  },
  {
    name: "type",
    label: "I am a...",
    type: "select" as const,
    items: [
      { label: "Student", value: "student", icon: "i-lucide-graduation-cap" },
      { label: "Educator", value: "educator", icon: "i-lucide-school" },
      { label: "Researcher", value: "researcher", icon: "i-lucide-text" },
      { label: "Other", value: "other", icon: "i-lucide-user" },
    ],
  },
];

export const getSignUpCallbackUrl = () => {
  const appUrl = useRuntimeConfig().public.appUrl;
  const callbackUrl = `${appUrl}/welcome`;
  return callbackUrl;
};

export const getLogInCallbackUrl = () => {
  const appUrl = useRuntimeConfig().public.appUrl;
  const callbackUrl = `${appUrl}/test`;
  return callbackUrl;
};
