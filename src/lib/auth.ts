import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user's verified JWT claims, or null when signed out.
 *
 * Render paths must use this, never `supabase.auth.getUser()`. getUser() sends
 * a request to the Supabase Auth server on every call, so reading it from the
 * root layout put a network round trip in front of every page's TTFB.
 * getClaims() verifies the token against the project JWKS, which auth-js caches
 * in a module-level map shared across instances, so a warm server does no
 * network work at all.
 *
 * Keep getUser() for Server Actions and Route Handlers, where it is the right
 * level of paranoia: it authorises against the Auth server instead of trusting
 * a local signature check.
 *
 * ponytail: this returns the JWT claims, which carry `sub` and `email` but not
 * the app's own buyer/artist/staff role. Roadmap 1.8 reads that from the
 * profiles table. Add a profiles lookup here when the first page needs it.
 */
export const getClaims = cache(async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  return data.claims;
});