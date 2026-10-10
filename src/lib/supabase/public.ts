import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-less Supabase client for public reads.
 *
 * Used by fully prerendered pages (like /artworks) that read from tables
 * with a public read policy. No cookies, no session — just the anon key.
 * This allows the page to use 'use cache' and prerender at build time.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
