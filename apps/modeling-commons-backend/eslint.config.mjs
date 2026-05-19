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
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/init-declarations': 'off',
    },
    ignores: [
      ...(typescriptConfig.ignores ?? []),
      'src/**/*.spec.ts',
      'src/**/*.mock.ts',
      'src/**/*.k6.ts',
      'src/**/*.mjs',
    ],
  },
  {
    ignores: [
      'node_modules',
      'dist',
      '.output',
      '*.spec.ts',
      '*.mock.ts',
      '*.k6.ts',
      'cucumber-report.html',
    ],
  },
];
