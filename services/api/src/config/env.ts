import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url().default('postgres://penthouse:penthouse@localhost:5432/penthouse'),
  JWT_SECRET: z.string().min(16).default('dev-secret-change-me-at-least-16'),
  JWT_ACCESS_EXPIRY: z.string().optional(),
  ACCESS_TOKEN_TTL: z.string().optional(),
  JWT_REFRESH_EXPIRY: z.string().optional(),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().optional(),
  ALTCHA_HMAC_KEY: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@penthouse.blog'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().optional(),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174'),
  DISABLE_RATE_LIMIT: z.coerce.string().transform(v => v === 'true').default('false'),
  PUBLIC_APP_URL: z.string().default(''),
  LEGACY_APK_DOWNLOAD_PATH: z.string().default('/downloads/legacy/the-penthouse.apk'),
  LEGACY_APK_STATUS: z.enum(['available', 'unavailable']).default('unavailable'),
  TEST_ACCOUNT_NOTICE_VERSION: z.string().default('alpha-v1'),
  ADMIN_BOOTSTRAP_USERNAME: z.string().default(''),
  GIPHY_API_KEY: z.string().default('')
});

const rawEnv = EnvSchema.parse(process.env);

export const env = {
  ...rawEnv,
  JWT_ACCESS_EXPIRY: rawEnv.JWT_ACCESS_EXPIRY ?? rawEnv.ACCESS_TOKEN_TTL ?? '15m',
  JWT_REFRESH_EXPIRY: rawEnv.JWT_REFRESH_EXPIRY ?? `${rawEnv.REFRESH_TOKEN_DAYS ?? 7}d`,
  MAX_FILE_SIZE_MB: rawEnv.MAX_FILE_SIZE_MB ?? rawEnv.UPLOAD_MAX_MB ?? 10
};

export const isProduction = env.NODE_ENV === 'production';
