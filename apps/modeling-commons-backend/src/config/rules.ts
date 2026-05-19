import { MEGABYTE } from '#src/shared/utils/consts.ts';
import type { FastifyRateLimitOptions } from '@fastify/rate-limit';
import type { BetterAuthRateLimitOptions } from 'better-auth';

const MINUTE_MS = 60 * 1000;
const rules = {
  limits: {
    fileUpload: {
      size: { max: 15 * MEGABYTE } as MinMax,
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
        '/forget-password': { window: 60, max: 5 },
        '/sign-in': { window: 60, max: 15 },
        '/sign-up': { window: 60, max: 10 },
      },
    } as BetterAuthRateLimitOptions,
  },
  mime: {
    deniedTypes: [
      'application/x-msdownload',
      'application/x-sh',
      'application/x-csh',
      'application/x-executable',
      'application/x-msdos-program',
      'application/x-msi',
      'application/x-apple-diskimage',
      'application/x-bat',
      'application/x-compressed-executable',
      'application/x-debian-package',
      'application/x-dosexec',
      'application/x-rpm',
    ],
    mappedTypes: [
      { pattern: /^text\/plain$/, mapped: 'application/octet-stream' },
      { pattern: /^text\/html$/, mapped: 'application/octet-stream' },
      { pattern: /^application\/javascript$/, mapped: 'application/octet-stream' },
      { pattern: /^application\/x-/, mapped: 'application/octet-stream' },
      { pattern: /^image\/svg\+xml$/, mapped: 'application/octet-stream' },
    ],
    undetectedTypesDefault: 'application/octet-stream',
    // Declared types that aren't real claims (browser fallbacks for unrecognized
    // extensions like .nlogox); skip the declared-vs-detected mismatch check.
    mismatchAllowedDeclaredTypes: ['application/octet-stream'],
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
