import { createClient } from '@supabase/supabase-js';

/**
 * Creates an untyped admin client for tables not in the main Database type
 * (like password_reset_otps which is a server-only table).
 * This bypasses TypeScript strictness for internal server operations.
 */
export function createUntypedAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
