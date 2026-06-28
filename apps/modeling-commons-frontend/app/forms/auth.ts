import type { AuthFormField, RadioGroupItem } from "#ui/types";
import type { infer as Infer } from "zod";

const z = await import("zod");

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

export const userKindOptions = [
  {
    label: "Student",
    value: "student",
    icon: "i-lucide-graduation-cap",
    description: "Learning through models, coursework, or independent study.",
  },
  {
    label: "Teacher",
    value: "teacher",
    icon: "i-lucide-school",
    description: "Using models in lessons, workshops, or curriculum design.",
  },
  {
    label: "Researcher",
    value: "researcher",
    icon: "i-lucide-flask-conical",
    description: "Building or studying models for analysis, experiments, or publications.",
  },
  {
    label: "Other",
    value: "other",
    icon: "i-lucide-user-round",
    description: "A role that does not fit neatly into the categories above.",
  },
] satisfies Array<RadioGroupItem>;

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
  {
    name: "rememberMe",
    label: "Remember Me",
    type: "checkbox" as const,
    required: false,
  },
];

export const changePasswordFields = [
  {
    name: "currentPassword",
    label: "Current Password",
    type: "password" as const,
    placeholder: "Enter your current password",
    required: true,
  },
  {
    name: "newPassword",
    label: "New Password",
    type: "password" as const,
    placeholder: "Enter a new password",
    required: true,
  },
  {
    name: "confirmNewPassword",
    label: "Confirm New Password",
    type: "password" as const,
    placeholder: "Confirm your new password",
    required: true,
  },
];

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

export const changeEmailFields = [
  {
    name: "newEmail",
    type: "text" as const,
    label: "New Email",
    placeholder: "Enter your new email",
    required: true,
  },
];

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
    label: "I am a ...",
    type: "select" as const,
    placeholder: "Student, Teacher, Researcher, or Other",
    items: userKindOptions.map((option) => ({
      label: option.label,
      value: option.value,
      icon: option.icon,
    })),
  },
];
