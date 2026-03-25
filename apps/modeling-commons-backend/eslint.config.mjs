import config from '@repo/eslint-config/base';
import typescriptConfig from '@repo/eslint-config/typescript';
import tseslint from 'typescript-eslint';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ...typescriptConfig,
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      ...typescriptConfig.rules,
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/class-literal-property-style': 'off',
      'custom-typescript-eslint/end-of-file-exports': 'off',
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
    },
  },
  {
    ignores: ['node_modules', 'dist', '.output', '*.spec.ts', '*.k6.ts', 'cucumber-report.html'],
  },
];
