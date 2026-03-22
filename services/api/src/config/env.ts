import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().default(20),
  ADMIN_BOOTSTRAP_USERNAME: z.string().default(''),
  TEST_ACCOUNT_NOTICE_VERSION: z.string().default('alpha-v1'),
  GIPHY_API_KEY: z.string().default(''),
  KLIPY_API_KEY: z.string().default(''),
  FCM_SERVICE_ACCOUNT_PATH: z.string().default(''),
  OPS_BUILD_ID: z.string().default(''),
  OPS_DEPLOYED_AT: z.string().default(''),
  BACKUP_STATUS_PATH: z.string().default('')
});

export const env = EnvSchema.parse(process.env);
