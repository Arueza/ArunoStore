import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie once per request, then keeps signed-out
 * visitors out of the signed-in routes.
 *
 * Without the refresh, nothing renews a session on navigation: `setAll` in
 * src/lib/supabase/server.ts can only fire from a Server Action, and it
 * swallows the write when called from a Server Component. Roadmap 1.8 adds
 * `/staff` to the guard below.
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
      const redirect = NextResponse.redirect(new URL("/login", request.url));

      for (const cookie of response.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }

      return redirect;
    }
  }

  return response;
}

// Sign-in only. Task 1.8 adds /staff, which also checks the role.
const SIGNED_IN_ROUTES = ["/dashboard"];

function needsUser(pathname: string) {
  return SIGNED_IN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export const config = {
  // Skips static files, the image optimiser and the favicon. Without this the
  // proxy runs on every asset request too, which needlessly delays them.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};