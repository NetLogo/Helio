import env from '#src/config/env.ts';
import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, openAPI } from 'better-auth/plugins';

import rules from '#src/config/rules.ts';
import transporter, { mailDomain } from './mail.ts';
import { prisma } from './prisma.ts';

export const auth = betterAuth({
  appName: env.product.name,
  baseURL: env.auth.url,
  basePath: '/api/auth',
  secret: env.auth.secret,
  trustedOrigins: env.cors.allowedOrigins,

  user: {
    additionalFields: {
      systemRole: {
        type: 'string',
        input: false,
      },
      userKind: {
        type: 'string',
      },
      isProfilePublic: {
        type: 'boolean',
      },
      onboardedAt: {
        type: 'date',
        required: false,
        input: false,
      },
      bio: {
        type: 'string',
        required: false,
      },
      country: {
        type: 'string',
        required: false,
      },
      socialLinks: {
        type: 'json',
        required: false,
      },
      dob: {
        type: 'date',
        required: false,
      },
      affiliation: {
        type: 'string',
        required: false,
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        const email = await mailDomain().createAccountEmailChangeRequestEmail(
          user.email,
          user.name,
          newEmail,
          url,
        );
        void transporter.sendMail(email).catch((err) => {
          console.error('Failed to send account email change confirmation email', err);
        });
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
    sendResetPassword: async ({ user, url }) => {
      const email = await mailDomain().createPasswordResetEmail(user.email, user.name, url);
      void transporter.sendMail(email).catch((err) => {
        console.error('Failed to send password reset email', err);
      });
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 60 * 60 * 24, // 24 hours
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const email = await mailDomain().createVerificationEmail(user.email, user.name, url);
      void transporter.sendMail(email).catch((err) => {
        console.error('Failed to send verification email', err);
      });
    },
  },

  rateLimit: {
    enabled: env.isProduction || env.isStaging,
    ...rules.limits.auth,
  },

  logger: {
    level: env.isProduction ? 'warn' : 'debug',
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
