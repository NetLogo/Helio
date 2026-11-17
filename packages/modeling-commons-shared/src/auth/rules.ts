export const authRules = {
  name: {
    length: { min: 2, max: 50 },
  },
  password: {
    length: { min: 8, max: 128 },
    complexity: [
      { key: 'letter', pattern: /[A-Za-z]/, description: 'at least one letter' },
      { key: 'number', pattern: /[0-9]/, description: 'at least one number' },
      {
        key: 'specialCharacter',
        pattern: /[@$!%*?&]/,
        description: 'at least one special character (@$!%*?&)',
      },
      { key: 'noSpaces', pattern: /^\S*$/, description: 'no spaces' },
    ],
  },
} as const

export type PasswordComplexityRule = (typeof authRules.password.complexity)[number]

export function getUnmetPasswordComplexityRules(password: string): Array<PasswordComplexityRule> {
  return authRules.password.complexity.filter((rule) => !rule.pattern.test(password))
}
