import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie once per request, then keeps signed-out
 * visitors out of the signed-in routes and non-staff out of /staff.
 *
 * Without the refresh, nothing renews a session on navigation: `setAll` in
 * src/lib/supabase/server.ts can only fire from a Server Action, and it
 * swallows the write when called from a Server Component.
 *
 * Note the filename. Next.js 16 renamed `middleware.ts` to `proxy.ts`;
 * `middleware.ts` is deprecated in this version.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Renews the access token when it is near expiry. Reads the cookie when there
  // is nothing to renew, so a signed-out visitor costs no network call.
  await supabase.auth.getSession();

  if (needsUser(request.nextUrl.pathname)) {
    // getUser() rather than getClaims(): this runs on every request to a
    // protected route, and only a call to the Auth server proves the token is
    // still live. getClaims() trusts a local signature check, which is the right
    // trade for rendering and the wrong one for a gate.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Carries any refreshed cookie onto the redirect, otherwise a session that
      // had just been renewed would be dropped on the way to the login page.
      return redirectTo(request, response, loginPathFor(request.nextUrl.pathname));
    }

    if (needsStaff(request.nextUrl.pathname) && !(await isStaff(supabase, user.id))) {
      // Signed in, so /login would be the wrong place to send them. The store is
      // where a buyer actually wants to be.
      return redirectTo(request, response, "/");
    }
  }

  return response;
}

// Sign-in only. /account holds the visitor's own name and role, so it must never
// render for a signed-out visitor. /commissions/request needs a session to write
// a row at all, so a signed-out visitor there is a dead end. /commissions/mine
// reads other people's commissions, and one signed out has none. The titipan pair
// is the same two reasons under different names: the form writes a row, the list
// reads that buyer's rows. Matching is on the whole segment or a path below it,
// which is why the public /titipan is not caught by the /titipan/mine entry.
const SIGNED_IN_ROUTES = [
  "/account",
  "/commissions/request",
  "/commissions/mine",
  "/titipan/request",
  "/titipan/mine",
];

// Also needs the role. There is no artist role as of roadmap 1.15: staff are the
// two of us and cover both halves.
const STAFF_ROUTES = ["/staff"];

function matches(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function needsUser(pathname: string) {
  return matches(pathname, SIGNED_IN_ROUTES) || matches(pathname, STAFF_ROUTES);
}

function needsStaff(pathname: string) {
  return matches(pathname, STAFF_ROUTES);
}

type Supabase = ReturnType<typeof createServerClient>;

/**
 * Whether this user is staff, read from the profiles row.
 *
 * The 0003 select policy allows a signed-in user to read exactly their own row
 * (auth.uid() = id), which is all this needs. Migration 0019 widened profiles so
 * staff can read every row, but this deliberately keeps the narrower read: the
 * guard is the last thing standing between a mis-set role and an open /staff, and
 * it should not depend on a policy it shares a migration with.
 *
 * A missing row answers false rather than throwing: migration 0003 may not be
 * applied yet, and a guard that fails open here would open /staff to everyone.
 */
async function isStaff(supabase: Supabase, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return data?.role === "staff";
}

/** Redirects, carrying any refreshed cookie so a renewal is not dropped. */
function redirectTo(
  request: NextRequest,
  response: NextResponse,
  path: string,
) {
  const redirect = NextResponse.redirect(new URL(path, request.url));

  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
}

/**
 * Where a signed-out visitor is sent, remembering where they were going.
 *
 * Without the next, a buyer who pressed "Mulai titipan" signs in and lands on
 * the storefront with no idea why they are there — the destination was thrown
 * away above, and the whole form was one click away. Only the titipan routes
 * carry it back: they are the pair the proxy turns away most often, and adding
 * it everywhere would mean a login link could park somebody anywhere at all.
 *
 * Only the pathname. The query string on these routes is always server feedback
 * (?saved=1, ?error=…) from a press that did not happen, so carrying it across a
 * login would greet the buyer with a "tersimpan" they never earned.
 *
 * The value is put on the query string URL-encoded because it is read back by
 * the query parser; safeNextPath() on the login side is what decides whether it
 * is honoured at all, and this is only the invitation.
 */
function loginPathFor(pathname: string) {
  if (!/^\/titipan\/[A-Za-z0-9/_-]*$/.test(pathname)) return "/login";

  return `/login?next=${encodeURIComponent(pathname)}`;
}

export const config = {
  // Skips static files, the image optimiser and the favicon. Without this the
  // proxy runs on every asset request too, which needlessly delays them.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};