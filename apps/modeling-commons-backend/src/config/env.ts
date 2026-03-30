import envSchema from 'env-schema';
import { type Static, Type } from 'typebox';

const NodeEnv = {
  development: 'development',
  production: 'production',
  test: 'test',
  staging: 'staging',
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
  PRODUCT_NAME: Type.String({ default: 'Modeling Commons' }),
  PRODUCT_DESCRIPTION: Type.String({
    default: 'A platform for sharing and discovering NetLogo models.',
  }),
  PRODUCT_KEYWORDS: Type.String({
    default:
      'netlogo,modeling,commons,simulation,agent-based,platform,constructionism,education,science,open-source',
  }),
  PRODUCT_VERSION: Type.String({ default: '0.1.0' }),
  PRODUCT_DISPLAY_NAME: Type.Optional(Type.String()),
  PRODUCT_WEBSITE: Type.String({ default: 'https://www.modelingcommons.org' }),
  IP_ADDRESS_HEADERS: Type.Optional(
    Type.String({
      default: 'cf-connecting-ip,X-Forwarded-For',
    }),
  ), // comma-separated list of IP address headers
});

const env = envSchema<Static<typeof schema>>({
  dotenv: true,
  schema,
});

const envVariableToList = (value: string | undefined, delim = ','): string[] => {
  if (!value) return [];
  return value.split(delim).map((v) => v.trim());
};

export default {
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === NodeEnv.development,
  isProduction: env.NODE_ENV === NodeEnv.production,
  isTest: env.NODE_ENV === NodeEnv.test,
  isStaging: env.NODE_ENV === NodeEnv.staging,
  version: env.PRODUCT_VERSION,
  log: {
    level: env.LOG_LEVEL,
  },
  server: {
    host: env.HOST,
    port: env.PORT,
    ipAddressHeaders: envVariableToList(env.IP_ADDRESS_HEADERS),
  },
  db: {
    url: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_URL}/${env.POSTGRES_DB}?sslmode=disable`,
  },
  cors: {
    allowedOrigins: envVariableToList(env.ALLOWED_ORIGINS),
  },
  auth: {
    secret: env.BETTER_AUTH_SECRET,
    url: env.BETTER_AUTH_URL,
  },
  product: {
    name: env.PRODUCT_NAME,
    description: env.PRODUCT_DESCRIPTION,
    keywords: envVariableToList(env.PRODUCT_KEYWORDS),
    version: env.PRODUCT_VERSION,
    displayName: env.PRODUCT_DISPLAY_NAME || env.PRODUCT_NAME,
    website: env.PRODUCT_WEBSITE,
  },
};
