import { MEGABYTE } from '#src/shared/utils/consts.ts';
import type { FastifyRateLimitOptions } from '@fastify/rate-limit';
import type { BetterAuthRateLimitOptions } from 'better-auth';

const MINUTE_MS = 60 * 1000;
const rules = {
  limits: {
    fileUpload: {
      size: { max: 30 * MEGABYTE } as MinMax,
      filesPerUpload: { max: 10 } as MinMax,
    },
    fileUploadRoute: {
      strict: {
        timeWindow: MINUTE_MS, // 1 minute
        max: 5,
      },
      loose: {
        timeWindow: MINUTE_MS,
        max: 50,
      },
    } as Record<'strict' | 'loose', FastifyRateLimitOptions>,

    auth: {
      window: 10,
      max: 100,
      customRules: {
        '/get-session': false,
      },
    } as BetterAuthRateLimitOptions,
  },
  avatar: {
    maxFileSize: 2 * MEGABYTE,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  },
  auth: {
    name: {
      length: { min: 2, max: 50 } as MinMax,
    },
    password: {
      length: { min: 8, max: 128 } as MinMax,
      complexity: [
        { pattern: /[A-Z]/, description: 'at least one uppercase letter' },
        { pattern: /[a-z]/, description: 'at least one lowercase letter' },
        { pattern: /[0-9]/, description: 'at least one digit' },
        {
          pattern: /[!@#$%^&*(),.?":{}|<>]/,
          description: 'at least one special character',
        },
      ] as RegexRule[],
    },
  },
};

type MinMax = { min?: number; max?: number };
type RegexRule = { pattern: RegExp; description: string };

export default rules;
