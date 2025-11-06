import { ESLintUtils } from "@typescript-eslint/utils";

const createTypescriptRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/NetLogo/Helio/blob/main/packages/eslint-config/rules/docs/custom-typescript-eslint.md#${name}`,
);

export default createTypescriptRule;
