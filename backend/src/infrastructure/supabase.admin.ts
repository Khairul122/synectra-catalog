import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  // Bound every DB/storage call so a hung Supabase request can't hold a serverless invocation.
  global: {
    fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(10_000) }),
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
