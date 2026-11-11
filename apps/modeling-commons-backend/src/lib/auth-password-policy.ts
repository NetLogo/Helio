import { getUnmetPasswordComplexityRules } from '@repo/modeling-commons-shared';
import { APIError, createAuthMiddleware } from 'better-auth/api';

const PASSWORD_FIELD_BY_PATH: Record<string, string> = {
  '/sign-up/email': 'password',
  '/reset-password': 'newPassword',
  '/change-password': 'newPassword',
};

export function assertPasswordMeetsComplexity(password: string): void {
  const unmet = getUnmetPasswordComplexityRules(password);
  if (unmet.length === 0) return;
  throw new APIError('BAD_REQUEST', {
    code: 'PASSWORD_TOO_WEAK',
    message: `Password must contain ${unmet.map((rule) => rule.description).join(', ')}`,
  });
}

export const passwordPolicyHook = createAuthMiddleware(async (ctx) => {
  const field = PASSWORD_FIELD_BY_PATH[ctx.path];
  if (!field) return;
  const password = (ctx.body as Record<string, unknown> | undefined)?.[field];
  if (typeof password === 'string') assertPasswordMeetsComplexity(password);
});
