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
 * The claims carry `sub` and `email` but not the app's own buyer/artist/staff
 * role. Those live in the profiles table, so read them with getProfile below
 * rather than widening this function.
 */
export const getClaims = cache(async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  return data.claims;
});

/**
 * The signed-in user's profile row: their full name and app role, or null when
 * signed out or when the row is missing.
 *
 * The claims alone cannot answer "who is this and what can they do" — the role
 * is the app's own buyer/artist/staff, not anything Supabase Auth knows about.
 * `sub` is the profiles primary key, so the signed-in user matches their own row
 * and nothing else, which is what the select policy in migration 0003 allows.
 *
 * maybeSingle() rather than single(): a signup whose trigger has not run yet has
 * no row at all, and that should read as "no profile", not as an error.
 */
export const getProfile = cache(async () => {
  const claims = await getClaims();

  if (!claims?.sub) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error || !data) return null;

  return data as { full_name: string; role: string };
});