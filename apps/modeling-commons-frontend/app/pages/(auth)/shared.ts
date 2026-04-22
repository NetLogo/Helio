import type { AuthFormField } from "#ui/types";
import * as z from "zod";

export const nameValidator = z
  .string("Name is required")
  .min(2, "Must be at least 2 characters")
  .max(50, "Must be less than 50 characters");
export const emailValidator = z.email("Must be a valid email address");

export const miniPasswordValidator = z
  .string("Password is required")
  .min(8, "Must be at least 8 characters")
  .max(128, "Must be less than 128 characters");
export const passwordValidator = miniPasswordValidator
  .regex(/[A-Za-z]/, "Must contain at least one letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[@$!%*?&]/, "Must contain at least one special character (@$!%*?&)")
  .regex(/^\S*$/, "Cannot contain spaces");
export const userKindValidator = z.enum(["student", "teacher", "researcher", "other"]).optional();

export const logInValidator = z.object({
  email: emailValidator,
  password: miniPasswordValidator,
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
    required: true,
  },
];

export const signUpValidator = z
  .object({
    name: nameValidator,
    email: emailValidator,
    password: passwordValidator,
    confirmPassword: z.string("Please confirm your password"),
    userKind: userKindValidator,
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
    required: true,
  },
  {
    name: "confirmPassword",
    label: "Confirm Password",
    type: "password" as const,
    placeholder: "Confirm your password",
    required: true,
  },
  {
    name: "userKind",
    label: "What brings you to the Modeling Commons? I am a ...",
    type: "select" as const,
    placeholder: "Student, Teacher, Researcher, or Other",
    items: [
      { label: "Student", value: "student", icon: "i-lucide-graduation-cap" },
      { label: "Teacher", value: "teacher", icon: "i-lucide-school" },
      { label: "Researcher", value: "researcher", icon: "i-lucide-text" },
      { label: "Other", value: "other", icon: "i-lucide-user" },
    ],
  },
];
