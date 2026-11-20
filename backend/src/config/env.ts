import { z } from 'zod';

// z.coerce.boolean() maps the string "false" to true; only the literal "true" enables a flag.
const envBoolean = z
  .string()
  .optional()
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_URL: z
    .string()
    .url()
    .default(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .default(process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role-key'),
  SIGNED_URL_EXPIRES_IN: z.coerce.number().int().positive().default(86400),
  DOKU_CLIENT_ID: z.string().default(process.env.DOKU_CLIENT_ID || 'MALL-ID-DEMO'),
  DOKU_SECRET_KEY: z.string().default(process.env.DOKU_SECRET_KEY || 'doku-secret-demo'),
  DOKU_API_BASE_URL: z.string().url().default(process.env.DOKU_API_BASE_URL || 'https://api-sandbox.doku.com'),
  DOKU_SIMULATOR: envBoolean,
  RESEND_API_KEY: z.string().default(process.env.RESEND_API_KEY || 're_demo_key'),
  RESEND_SIMULATOR: envBoolean,
  MAIL_FROM_ADDRESS: z
    .string()
    .default(process.env.MAIL_FROM_ADDRESS || 'Synectra Jasa Digital <delivery@example.com>'),
  APP_URL: z
    .string()
    .url()
    .default(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
});

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SIGNED_URL_EXPIRES_IN: process.env.SIGNED_URL_EXPIRES_IN,
  DOKU_CLIENT_ID: process.env.DOKU_CLIENT_ID,
  DOKU_SECRET_KEY: process.env.DOKU_SECRET_KEY,
  DOKU_API_BASE_URL: process.env.DOKU_API_BASE_URL,
  DOKU_SIMULATOR: process.env.DOKU_SIMULATOR,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_SIMULATOR: process.env.RESEND_SIMULATOR,
  MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS,
  APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
});

// Fail fast in production instead of silently running on placeholder secrets or simulators.
if (parsed.NODE_ENV === 'production') {
  const missing = ['SUPABASE_SERVICE_ROLE_KEY', 'DOKU_CLIENT_ID', 'DOKU_SECRET_KEY', 'RESEND_API_KEY'].filter(
    (key) => !process.env[key],
  );
  if (missing.length > 0) {
    throw new Error(`Missing required production env: ${missing.join(', ')}`);
  }
  if (parsed.DOKU_SIMULATOR || parsed.RESEND_SIMULATOR) {
    throw new Error('DOKU_SIMULATOR / RESEND_SIMULATOR must be disabled in production');
  }
}

export const env = parsed;
