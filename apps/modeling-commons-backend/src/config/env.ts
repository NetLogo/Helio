import envSchema from 'env-schema';
import { type Static, Type } from 'typebox';

const NodeEnv = {
  development: 'development',
  production: 'production',
  test: 'test',
} as const;

export const LogLevel = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const schema = Type.Object({
  POSTGRES_URL: Type.String(),
  POSTGRES_PASSWORD: Type.String(),
  POSTGRES_USER: Type.String(),
  POSTGRES_DB: Type.String(),
  LOG_LEVEL: Type.Enum(LogLevel),
  NODE_ENV: Type.Enum(NodeEnv),
  HOST: Type.String({ default: 'localhost' }),
  PORT: Type.Number({ default: 3000 }),
  ALLOWED_ORIGINS: Type.Optional(Type.String()), // comma-separated list of allowed CORS origins
  BETTER_AUTH_SECRET: Type.String(),
  BETTER_AUTH_URL: Type.String(),
});

const env = envSchema<Static<typeof schema>>({
  dotenv: true,
  schema,
});

export default {
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === NodeEnv.development,
  isProduction: env.NODE_ENV === NodeEnv.production,
  version: '0.0.0',
  log: {
    level: env.LOG_LEVEL,
  },
  server: {
    host: env.HOST,
    port: env.PORT,
  },
  db: {
    url: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_URL}/${env.POSTGRES_DB}?sslmode=disable`,
  },
  cors: {
    allowedOrigins: typeof env.ALLOWED_ORIGINS === 'string'
      ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : [],
  },
  auth: {
    secret: env.BETTER_AUTH_SECRET,
    url: env.BETTER_AUTH_URL,
  },
};
