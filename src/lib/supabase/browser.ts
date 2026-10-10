import { createBrowserClient } from "@supabase/ssr";

/**
 * A Supabase client for the browser, used for Storage uploads from client
 * components.
 *
 * The server client in src/lib/supabase/server.ts handles SSR with cookie
 * forwarding. This one is for client-side interactions that need to talk to
 * Supabase directly — currently artwork uploads and deletes from the staff
 * gallery page.
 *
 * No cookie handling: the browser client reads the session from localStorage,
 * which is fine for Storage operations that go through RLS policies.
 */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
