import { describe, expect, it } from "vitest";
import {
  emailOnlyValidator,
  emailValidator,
  logInValidator,
  miniPasswordValidator,
  nameValidator,
  passwordValidator,
  resetPasswordValidator,
  signUpValidator,
  userKindValidator,
} from "./shared";

describe("nameValidator", () => {
  it("rejects an empty string with 'Must be at least 2 characters'", () => {
    const result = nameValidator.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must be at least 2 characters", path: [] }),
      );
    }
  });

  it("rejects a single character (under min)", () => {
    const result = nameValidator.safeParse("a");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must be at least 2 characters" }),
      );
    }
  });

  it("accepts exactly 2 characters", () => {
    expect(nameValidator.safeParse("ab").success).toBe(true);
  });

  it("accepts exactly 50 characters", () => {
    expect(nameValidator.safeParse("a".repeat(50)).success).toBe(true);
  });

  it("rejects 51 characters with 'Must be less than 50 characters'", () => {
    const result = nameValidator.safeParse("a".repeat(51));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must be less than 50 characters", path: [] }),
      );
    }
  });
});

describe("emailValidator", () => {
  it("accepts a valid email", () => {
    expect(emailValidator.safeParse("user@example.com").success).toBe(true);
  });

  it("rejects an email missing '@' with 'Must be a valid email address'", () => {
    const result = emailValidator.safeParse("userexample.com");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must be a valid email address" }),
      );
    }
  });

  it("rejects an email missing the TLD", () => {
    const result = emailValidator.safeParse("user@example");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must be a valid email address" }),
      );
    }
  });
});

describe("miniPasswordValidator", () => {
  it("rejects an empty string", () => {
    const result = miniPasswordValidator.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must be at least 8 characters" }),
      );
    }
  });

  it("rejects a 7-character string", () => {
    const result = miniPasswordValidator.safeParse("abcdefg");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must be at least 8 characters" }),
      );
    }
  });

  it("accepts exactly 8 characters", () => {
    expect(miniPasswordValidator.safeParse("abcdefgh").success).toBe(true);
  });

  it("accepts exactly 128 characters", () => {
    expect(miniPasswordValidator.safeParse("a".repeat(128)).success).toBe(true);
  });

  it("rejects 129 characters", () => {
    const result = miniPasswordValidator.safeParse("a".repeat(129));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must be less than 128 characters" }),
      );
    }
  });
});

describe("passwordValidator", () => {
  it("rejects letters-only with 'Must contain at least one number'", () => {
    const result = passwordValidator.safeParse("abcdefgh");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must contain at least one number" }),
      );
    }
  });

  it("rejects digits-only with 'Must contain at least one letter'", () => {
    const result = passwordValidator.safeParse("12345678");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Must contain at least one letter" }),
      );
    }
  });

  it("rejects letters+digits without a special character", () => {
    const result = passwordValidator.safeParse("abc12345");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: "Must contain at least one special character (@$!%*?&)",
        }),
      );
    }
  });

  it("rejects passwords containing spaces", () => {
    const result = passwordValidator.safeParse("abcd 123!");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Cannot contain spaces" }),
      );
    }
  });

  it("accepts a password meeting all four requirements", () => {
    expect(passwordValidator.safeParse("Abc123!@").success).toBe(true);
  });
});

describe("userKindValidator", () => {
  it.each(["student", "teacher", "researcher", "other"] as const)("accepts '%s'", (value) => {
    expect(userKindValidator.safeParse(value).success).toBe(true);
  });

  it("accepts undefined (optional)", () => {
    expect(userKindValidator.safeParse(undefined).success).toBe(true);
  });

  it("rejects 'admin'", () => {
    expect(userKindValidator.safeParse("admin").success).toBe(false);
  });
});

describe("logInValidator", () => {
  it("accepts a valid email/password pair", () => {
    const result = logInValidator.safeParse({
      email: "user@example.com",
      password: "abcdefgh",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when email is missing", () => {
    const result = logInValidator.safeParse({ password: "abcdefgh" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "email")).toBe(true);
    }
  });

  it("rejects when password is missing", () => {
    const result = logInValidator.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "password")).toBe(true);
    }
  });
});

describe("emailOnlyValidator", () => {
  it("accepts a valid email", () => {
    expect(emailOnlyValidator.safeParse({ email: "user@example.com" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = emailOnlyValidator.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: "Must be a valid email address",
          path: ["email"],
        }),
      );
    }
  });
});

describe("resetPasswordValidator", () => {
  it("accepts when passwords match", () => {
    const result = resetPasswordValidator.safeParse({
      password: "Abc123!@",
      confirmPassword: "Abc123!@",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when passwords mismatch with 'Passwords do not match' on confirmPassword", () => {
    const result = resetPasswordValidator.safeParse({
      password: "Abc123!@",
      confirmPassword: "Different1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: "Passwords do not match",
          path: ["confirmPassword"],
        }),
      );
    }
  });

  it("rejects a weak password (delegates to passwordValidator)", () => {
    const result = resetPasswordValidator.safeParse({
      password: "abcdefgh",
      confirmPassword: "abcdefgh",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "password")).toBe(true);
    }
  });
});

describe("signUpValidator", () => {
  const validBase = {
    name: "Alice",
    email: "alice@example.com",
    password: "Abc123!@",
    confirmPassword: "Abc123!@",
    userKind: { value: "student" as const },
  };

  it("accepts a fully valid signup payload", () => {
    expect(signUpValidator.safeParse(validBase).success).toBe(true);
  });

  it("rejects when password equals email with 'Password cannot be the same as email' on password", () => {
    const result = signUpValidator.safeParse({
      ...validBase,
      email: "Abc123!@",
      password: "Abc123!@",
      confirmPassword: "Abc123!@",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: "Password cannot be the same as email",
          path: ["password"],
        }),
      );
    }
  });

  it("rejects when password equals name with 'Password cannot be the same as name' on password", () => {
    const result = signUpValidator.safeParse({
      ...validBase,
      name: "Abc123!@",
      password: "Abc123!@",
      confirmPassword: "Abc123!@",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: "Password cannot be the same as name",
          path: ["password"],
        }),
      );
    }
  });

  it("rejects when passwords mismatch on confirmPassword path", () => {
    const result = signUpValidator.safeParse({
      ...validBase,
      confirmPassword: "Different1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: "Passwords do not match",
          path: ["confirmPassword"],
        }),
      );
    }
  });

  it("accepts userKind wrapped as { value: 'student' }", () => {
    const result = signUpValidator.safeParse({
      ...validBase,
      userKind: { value: "student" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid userKind value", () => {
    const result = signUpValidator.safeParse({
      ...validBase,
      userKind: { value: "admin" },
    });
    expect(result.success).toBe(false);
  });
});
