export const authLiterals = {
  validation: {
    minLength: "Must be at least {min} characters",
    maxLength: "Must be less than {max} characters",
    passwordComplexity: {
      letter: "Must contain at least one letter",
      number: "Must contain at least one number",
      specialCharacter: "Must contain at least one special character (@$!%*?&)",
      noSpaces: "Cannot contain spaces",
    },
  },
  userKindOptions: [
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
  ],
  logInFields: [
    {
      name: "email",
      type: "text",
      label: "Email",
      placeholder: "Enter your email",
      required: true,
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Enter your password",
      required: true,
    },
    {
      name: "rememberMe",
      label: "Remember Me",
      type: "checkbox",
      required: false,
    },
  ],
  changePasswordFields: [
    {
      name: "currentPassword",
      label: "Current Password",
      type: "password",
      placeholder: "Enter your current password",
      required: true,
    },
    {
      name: "newPassword",
      label: "New Password",
      type: "password",
      placeholder: "Enter a new password",
      required: true,
    },
    {
      name: "confirmNewPassword",
      label: "Confirm New Password",
      type: "password",
      placeholder: "Confirm your new password",
      required: true,
    },
  ],
  changeEmailFields: [
    {
      name: "newEmail",
      type: "text",
      label: "New Email",
      placeholder: "Enter your new email",
      required: true,
    },
  ],
  signUpFields: [
    {
      name: "name",
      type: "text",
      label: "Name",
      placeholder: "Enter your name",
      required: true,
    },
    {
      name: "email",
      type: "text",
      label: "Email",
      placeholder: "Enter your email",
      required: true,
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Create a password",
      required: true,
    },
    {
      name: "confirmPassword",
      label: "Confirm Password",
      type: "password",
      placeholder: "Confirm your password",
      required: true,
    },
    {
      name: "userKind",
      label: "I am a ...",
      type: "select",
      placeholder: "Student, Teacher, Researcher, or Other",
    },
  ],
} as const;
