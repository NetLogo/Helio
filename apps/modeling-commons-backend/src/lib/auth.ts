import env from '#src/config/env.ts';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { openAPI, admin } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';

import { prisma } from './prisma.ts';
import rules from '#src/config/rules.ts';

export const auth = betterAuth({
  appName: env.product.name,
  baseURL: env.auth.url,
  basePath: '/auth',
  secret: env.auth.secret,
  trustedOrigins: env.cors.allowedOrigins,

  user: {
    additionalFields: {
      systemRole: {
        type: 'string',
      },
      userKind: {
        type: 'string',
      },
      isProfilePublic: {
        type: 'boolean',
      },
    },
    deleteUser: {
      enabled: false,
    },
  },

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    maxPasswordLength: rules.auth.password.length.max,
    minPasswordLength: rules.auth.password.length.min,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }) => {
      void console.log(
        `Send verification email to ${user.email} with url: ${url} and token: ${token}`,
      );
    },
  },

  rateLimit: {
    enabled: env.isProduction || env.isStaging,
    ...rules.limits.auth,
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: env.server.ipAddressHeaders,
    },
    database: {
      generateId: 'uuid',
    },
  },

  plugins: [openAPI({ disableDefaultReference: false }), admin(), passkey()],
});

export type Session = typeof auth.$Infer.Session;
