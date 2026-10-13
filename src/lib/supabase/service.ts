import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-only writes that bypass RLS.
 *
 * Used by the checkout and webhook handlers, which write to payments and
 * update order status without a user session. Never expose this key to the
 * browser — it lives in .env.local and Vercel only.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing — copy it from Supabase dashboard to .env.local",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
