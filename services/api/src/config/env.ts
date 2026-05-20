import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url().default('postgres://penthouse:penthouse@localhost:5434/penthouse'),
  JWT_SECRET: z.string().min(16).default('dev-secret-change-me-at-least-16'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  ALTCHA_HMAC_KEY: z.string().optional(),
  PUBLIC_APP_URL: z.string().default(''),
  LEGACY_APK_DOWNLOAD_PATH: z.string().default('/downloads/legacy/the-penthouse.apk'),
  LEGACY_APK_STATUS: z.enum(['available', 'unavailable']).default('unavailable'),
  OPS_BUILD_ID: z.string().default(''),
  OPS_DEPLOYED_AT: z.string().default(''),
  BACKUP_STATUS_PATH: z.string().default(''),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@penthouse.blog'),
  UPLOAD_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().optional(),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174'),
  DISABLE_RATE_LIMIT: z.coerce.string().transform(v => v === 'true').default('false'),
  TRUST_PROXY: z.coerce.string().transform(v => v === 'true').default('false'),
  MEDIASOUP_ENABLED: z.coerce.string().default('true').transform(v => v === 'true'),
  MEDIASOUP_LISTEN_IP: z.string().default('0.0.0.0'),
  MEDIASOUP_ANNOUNCED_IP: z.string().default('127.0.0.1'),
  MEDIASOUP_MIN_PORT: z.coerce.number().int().positive().default(10000),
  MEDIASOUP_MAX_PORT: z.coerce.number().int().positive().default(10100),
  MEDIASOUP_INITIAL_OUTGOING_BITRATE: z.coerce.number().int().positive().default(1_000_000),
  MEDIASOUP_LOG_LEVEL: z.enum(['debug', 'warn', 'error', 'none']).default('warn'),
  TURN_ENABLED: z.coerce.string().default('false').transform(v => v === 'true'),
  TURN_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional()
});

const parsedEnv = EnvSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  MAX_FILE_SIZE_MB: parsedEnv.MAX_FILE_SIZE_MB ?? parsedEnv.UPLOAD_MAX_MB ?? 10
};

export const isProduction = env.NODE_ENV === 'production';
